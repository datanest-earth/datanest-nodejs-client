import { createHmac } from 'crypto';

export default class DatanestClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;
    private fetchClient = fetch;

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

    private async sendRequest(method: string, path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        method = method.toUpperCase();
        // remove leading slash
        path = path.replace(/^\//, '');

        const headers = {
            ...(fetchOptions?.headers ?? {}),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };
        const options: DatanestRequestInit = {
            redirect: 'error',
            mode: 'no-cors',
            ...fetchOptions,
            method,
            headers,
        };

        let url = `${this.baseUrl}/${path}`;
        if (params && (method === 'GET' || method === 'DELETE')) {
            const queryParams = new URLSearchParams(params);
            if (queryParams.size) {
                queryParams.sort();
                url += `?${queryParams}`;
            }
        } else if (params) {
            options.body = JSON.stringify(params);
        }

        // Sign the request (implement the signing logic)
        this.signRequest(url, options);

        return await this.fetchClient(url, options);
    }

    public async get(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('GET', path, params, fetchOptions);
    }

    public async post(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('POST', path, params, fetchOptions);
    }

    public async patch(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('PATCH', path, params, fetchOptions);
    }

    public async put(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('PUT', path, params, fetchOptions);
    }

    public async delete(path: string, params?: Record<string, any>, fetchOptions?: DatanestRequestInit) {
        return await this.sendRequest('DELETE', path, params, fetchOptions);
    }

    public setBaseUrl(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * You can use this method to set a custom fetch client
     * e.g. to use a mock fetch client in test.
     * Or use `node-fetch` in earlier node.js version (untested).
     * @param fetchClient A fetch client that implements the fetch API
     */
    private setFetchClient(fetchClient: any) {
        this.fetchClient = fetchClient;
    }
}

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

export type DatanestRequestInit = {
    timeout?: number;
} & RequestInit;
