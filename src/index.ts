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

    private signRequest(url: string, requestOptions: RequestInit) {
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

    private async sendRequest(method: string, path: string, params?: Record<string, any>, fetchOptions?: RequestInit) {
        method = method.toUpperCase();
        // remove leading slash
        path = path.replace(/^\//, '');

        let url = `${this.baseUrl}/${path}`;

        if (params && (method === 'GET' || method === 'DELETE')) {
            const queryParams = new URLSearchParams(params);
            url += `?${queryParams}`;
        }

        const headers = {
            ...(fetchOptions?.headers ?? {}),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };

        const options: RequestInit = {
            redirect: 'error',
            mode: 'no-cors',
            ...fetchOptions,
            method,
            headers,
        };

        if (params) {
            options.body = JSON.stringify(params);
        }

        // Sign the request (implement the signing logic)
        this.signRequest(url, options);

        return await this.fetchClient(url, options);
    }

    public async get(path: string, params?: Record<string, any>, fetchOptions?: any) {
        return await this.sendRequest('GET', path, params, fetchOptions);
    }

    public async post(path: string, params?: Record<string, any>, fetchOptions?: any) {
        return await this.sendRequest('POST', path, params, fetchOptions);
    }

    public async patch(path: string, params?: Record<string, any>, fetchOptions?: any) {
        return await this.sendRequest('PATCH', path, params, fetchOptions);
    }

    public async put(path: string, params?: Record<string, any>, fetchOptions?: any) {
        return await this.sendRequest('PUT', path, params, fetchOptions);
    }

    public async delete(path: string, params?: Record<string, any>, fetchOptions?: any) {
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
