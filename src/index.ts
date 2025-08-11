import { createHmac } from 'node:crypto';
import * as projects from './projects';
import * as workflows from './workflows';
import * as enviro from './enviro';
import * as gather from './gather';
import * as integrations from './integrations';
import * as teams from './teams';
import * as users from './users';
import * as files from './files';
import * as webhook from './webhook';

/**
 * @deprecated Use `users` namespace instead
 */
const user = users;

export {
    DatanestClient,
    enviro,
    gather,
    projects,
    workflows,
    integrations,
    teams,
    user,
    users,
    files,
    webhook,
}

export default class DatanestClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;
    private clientId: string | null = null;
    private logErrors: boolean = true;
    private logTrace: boolean = false;

    // Static rate limiter properties (shared across all instances)
    private static rateLimitMax: number = 120 / 8; // Divide by 8 to allow for shorter max delays
    private static rateLimitIntervalMs: number = 60_000 / 8;
    private static requestTimestamps: number[] = [];

    /**
     * Create a new Datanest API client
     * Note: You can use environment variables instead of using
     *       the constructor params `apiKey` and `apiSecret`
     * ENV:
     * - `DATANEST_API_KEY`
     * - `DATANEST_API_SECRET`
     * - `DATANEST_API_BASE_URL` (optional) Default: https://app.datanest.earth/api 
     */
    constructor(apiKey?: string, apiSecret?: string) {
        this.apiKey = apiKey || process.env.DATANEST_API_KEY || '';
        this.apiSecret = apiSecret || process.env.DATANEST_API_SECRET || '';
        this.baseUrl = process.env.DATANEST_API_BASE_URL || 'https://app.datanest.earth/api';

        // Remove trailing slash
        this.baseUrl = this.baseUrl.replace(/\/$/, '');

        if (!this.baseUrl.endsWith('/api')) {
            throw new Error('Invalid base URL. Must end with "/api"');
        }

        if (this.apiKey === "" || this.apiSecret === "") {
            throw new Error('API key and secret are required.');
        }
    }

    public static disableRateLimit() {
        DatanestClient.rateLimitMax = 100_000_000;
        DatanestClient.rateLimitIntervalMs = 0;
    }

    /** Datanest accepts up to 60 requests per minute, default limit is less for typical use */
    public static setRateLimit(maxRequests: number, intervalMs: number = 60_000) {
        DatanestClient.rateLimitMax = maxRequests;
        DatanestClient.rateLimitIntervalMs = intervalMs;
    }

    private static async checkRateLimit(logWarning = false) {
        while (DatanestClient.requestTimestamps.length >= DatanestClient.rateLimitMax) {
            const now = Date.now();
            DatanestClient.requestTimestamps = DatanestClient.requestTimestamps.filter(timestamp => now - timestamp < DatanestClient.rateLimitIntervalMs);
            // Calculate wait time until the oldest timestamp expires from the window.
            const waitTime = DatanestClient.rateLimitIntervalMs - (now - DatanestClient.requestTimestamps[0]);
            if (logWarning) {
                console.debug('Waiting for rate limit window to expire', waitTime);
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        DatanestClient.requestTimestamps.push(Date.now());
    }

    public setLogErrors(logErrors: boolean) {
        this.logErrors = logErrors;
    }

    public setLogTrace(logTrace: boolean) {
        this.logTrace = logTrace;
    }

    private signRequest(url: string, requestOptions: DatanestRequestInit) {
        const hmac = createHmac('sha256', this.apiSecret);

        const timestamp = Date.now() / 1000;
        if (!requestOptions.headers) {
            requestOptions.headers = {};
        }
        const headers: any = requestOptions.headers;
        headers['X-Timestamp'] = timestamp.toFixed(0);
        const content = `${requestOptions.method}:${url}:${requestOptions.body ? requestOptions.body + ':' : ''}${timestamp.toFixed(0)}`;
        headers['X-Signature'] = hmac.update(content).digest('hex');
    }

    /**
     * Send a request to the Datanest API
     * @param method 
     * @param path 
     * @param params 
     * @param fetchOptions 
     * @throws DatanestResponseError Request HTTP server or validation error
     * @returns Fetch response with readable stream.
     */
    private async sendRequest(method: string, path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        if (DatanestClient.rateLimitIntervalMs > 0 && DatanestClient.rateLimitMax !== Infinity) {
            await DatanestClient.checkRateLimit(this.logErrors);
        }

        method = method.toUpperCase();
        // remove leading slash
        path = path.replace(/^\//, '');

        if (path.startsWith('api/')) {
            throw new Error('Invalid endpoint, must not start with "api/"');
        }

        const headers: any = {
            ...(fetchOptions?.headers ?? {}),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
        };
        if (this.clientId) {
            headers['X-Client-ID'] = this.clientId;
        }
        const options: DatanestRequestInit = {
            redirect: 'error',
            mode: method !== 'DELETE' && method !== 'PATCH' ? 'no-cors' : undefined,
            ...fetchOptions,
            method,
            headers,
        };

        let url = `${this.baseUrl}/${path}`;
        if (params) {
            if (method === 'GET' || method === 'DELETE') {
                const queryParams = new URLSearchParams(params);
                if (queryParams.size) {
                    queryParams.sort();
                    // replace all spaces with %20, as URLSearchParams uses + instead of %20
                    url += `?${queryParams.toString().replace(/\+/g, '%20')}`;
                }
            } else {
                options.body = JSON.stringify(params);
            }
        }

        // Sign the request (implement the signing logic)
        this.signRequest(url, options);
        const response = await fetch(url, options);

        if (response.status > 299) {
            const error = new DatanestResponseError(`Datanest API Failed: ${path}: ${response.status}`, response.status, await response.json());
            if (this.logErrors) {
                console.error(error.message, error.data);
            } else {
                this.traceRequest(method, url, params, options, response);
            }
            throw error;
        }

        this.traceRequest(method, url, params, options, response);

        return response;
    }

    private traceRequest(method: string, url: string, params?: Record<string, any>, options?: DatanestRequestInit, response?: Response) {
        if (!this.logTrace) {
            return;
        }

        const sanitizedOptions = options ? structuredClone(options) : undefined;
        if (sanitizedOptions?.headers) {
            sanitizedOptions.headers = {
                ...sanitizedOptions.headers,
                'X-API-Key': '(REDACTED)',
                'X-Signature': '(REDACTED)',
            };
        }

        if (method === 'GET' || method === 'DELETE') {
            console.log(method, url, sanitizedOptions, response?.status, response?.statusText);
            return;
        }

        console.log(method, url, params, sanitizedOptions, response?.status, response?.statusText);
    }

    /**
     * Send a GET request to the Datanest API
     * @param path e.g. `v1/projects`
     * @param params Query parameters
     * @param fetchOptions
     * @throws DatanestResponseError Request HTTP server or validation error
     * @returns Fetch response with readable stream.
     */
    public async get(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('GET', path, params, fetchOptions);
    }

    /**
     * Send a POST request to the Datanest API
     * @param path e.g. `v1/projects`
     * @param params Will be converted to JSON in request body
     * @param fetchOptions
     * @throws DatanestResponseError Request HTTP server or validation error
     * @returns Fetch response with readable stream.
     */
    public async post(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('POST', path, params, fetchOptions);
    }

    /**
     * Send a PATCH request to the Datanest API
     * @param path e.g. `v1/projects/{uuid}`
     * @param params Will be converted to JSON in request body
     * @param fetchOptions
     * @throws DatanestResponseError Request HTTP server or validation error
     * @returns Fetch response with readable stream.
     */
    public async patch(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('PATCH', path, params, fetchOptions);
    }

    /**
     * Send a PUT request to the Datanest API
     * @param path e.g. `v1/projects/{uuid}`
     * @param params Will be converted to JSON in request body
     * @param fetchOptions
     * @throws DatanestResponseError Request HTTP server or validation error
     * @returns Fetch response with readable stream.
     */
    public async put(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('PUT', path, params, fetchOptions);
    }

    /**
     * Send a DELETE request to the Datanest API
     * @param path e.g. `v1/projects/{uuid}`
     * @param params Query parameters
     * @param fetchOptions
     * @throws DatanestResponseError Request HTTP server or validation error
     * @returns Fetch response with readable stream.
     */
    public async delete(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('DELETE', path, params, fetchOptions);
    }

    /**
     * Set the base URL for the Datanest API
     * @param baseUrl e.g. `https://app.datanest.earth/api`
     */
    public setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;

        if (!this.baseUrl.endsWith('/api')) {
            throw new Error('Invalid base URL. Must end with "/api"');
        }
    }

    /**
     * Set your client ID for the Datanest API
     * This will append the `X-Client-ID` header to all requests
     * @param clientId Your application identifier, this can assist Datanest for debugging assistance
     */
    public setClientId(clientId: string) {
        this.clientId = clientId;
    }

    public removeClientId() {
        this.clientId = null;
    }
}

/**
 * From Fetch API
 */
interface RequestInit {
    /** A BodyInit object or null to set request's body. */
    body?: BodyInit | null;
    /** A string indicating how the request will interact with the browser's cache to set request's cache. */
    cache?: RequestCache;
    /** A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials. */
    credentials?: RequestCredentials;
    /** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
    headers?: HeadersInit;
    /** A cryptographic hash of the resource to be fetched by request. Sets request's integrity. */
    integrity?: string;
    /** A boolean to set request's keepalive. */
    keepalive?: boolean;
    /** A string to set request's method. */
    method?: string;
    /** A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode. */
    mode?: RequestMode;
    /** A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect. */
    redirect?: RequestRedirect;
    /** A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer. */
    referrer?: string;
    /** A referrer policy to set request's referrerPolicy. */
    referrerPolicy?: ReferrerPolicy;
    /** An AbortSignal to set request's signal. */
    signal?: AbortSignal | null;
    /** Can only be null. Used to disassociate request from any Window. */
    window?: null;
}

export type DatanestRequestInit = RequestInit;

export class DatanestResponseError extends Error {
    /**
     * HTTP status code
     */
    public status: number;

    /**
     * Server response data
     */
    public data: any;

    constructor(message: string, status: number, data: any) {
        let msg = message;
        if (typeof data.message === 'string') {
            msg += `: ${data.message}`;
        }
        super(msg);
        this.status = status;
        this.data = data;
    }
}

/**
 * ISO 8601 date string
 */
export type Timestamp = string;

export type Timestamps = {
    created_at: Timestamp,
    updated_at: Timestamp,
};
export type SoftDelete = {
    deleted_at?: Timestamp | null,
};

/**
 * Supported ISO 3166-1 alpha-2 country codes
 */
export type Country2CharCode = 'NZ' | 'GB' | 'US' | 'AU' | 'CA';

export type MeasurementType = 'metre' | 'feet' | 'inch' | 'mm' | 'cm';

export type UUID = string;
/** Lowercase is recommended. */
export type Email = string;

export type PaginatedResponse<T> = {
    data: T[],

    /**
     * @deprecated This may not be permanent
     */
    links?: {
        first: string,
        last: string,
        prev: null | string,
        next: null | string,
    },

    meta: {
        /**
         * @deprecated This may not be permanent
         */
        links?: {
            url: null | string, label: string, active: boolean,
        }[],

        /**
         * Current page number
         */
        current_page: number;

        /**
         * Last page number
         */
        last_page: number;

        /**
         * Number of items per page
         */
        per_page: number;

        /**
         * Total number of items
         */
        total: number;
    },
};

/**
 * Filters for date range queries
 * Supports YYYY-MM-DD or full ISO 8601 timestamps
 */
export type DateRangeFilters = {
    created_from?: Timestamp | null;
    created_to?: Timestamp | null;
    updated_from?: Timestamp | null;
    updated_to?: Timestamp | null;
}
