import { createHmac } from 'node:crypto';
import * as projects from './projects';
import * as gather from './gather';
import * as integrations from './integrations';
import * as teams from './teams';
import * as user from './user';

export {
    DatanestClient,
    gather,
    projects,
    integrations,
    teams,
    user,
}

export default class DatanestClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;
    private clientId: string | null = null;

    constructor(apiKey?: string, apiSecret?: string) {
        this.apiKey = apiKey || process.env.DATANEST_API_KEY || '';
        this.apiSecret = apiSecret || process.env.DATANEST_API_SECRET || '';
        this.baseUrl = process.env.DATANEST_API_BASE_URL || 'https://app.datanest.earth/api';

        // Remove trailing slash
        this.baseUrl = this.baseUrl.replace(/\/$/, '');

        if (this.apiKey === "" || this.apiSecret === "") {
            throw new Error('API key and secret are required.');
        }
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
        method = method.toUpperCase();
        // remove leading slash
        path = path.replace(/^\//, '');

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
                    url += `?${queryParams}`;
                }
            } else {
                options.body = JSON.stringify(params);
            }
        }

        // Sign the request (implement the signing logic)
        this.signRequest(url, options);
        const response = await fetch(url, options);

        if (response.status > 299) {
            throw new DatanestResponseError(`Datanest API Failed: ${path}: ${response.status}`, response.status, await response.json());
        }

        return response;
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
        super(message);
        this.status = status;
        this.data = data;
    }
}

/**
 * ISO 8601 date string
 */
export type Timestamp = string;

/**
 * Supported ISO 3166-1 alpha-2 country codes
 */
export type Country2CharCode = 'NZ' | 'GB' | 'US' | 'AU' | 'CA';

export type MeasurementType = 'metre' | 'feet' | 'inch' | 'mm' | 'cm';

export type UUID = string;

export type PaginatedResponse<T> = {
    data: T[],

    /**
     * @deprecated This may not be permanent
     */
    links: {
        first: string,
        last: string,
        prev: null | string,
        next: null | string,
    },

    meta: {
        /**
         * @deprecated This may not be permanent
         */
        links: {
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
