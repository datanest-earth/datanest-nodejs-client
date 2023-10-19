import { it, expect, vi } from 'vitest';
import DatanestClient from '../src';

declare const fetch: any;

it('Can make a GET request', async () => {
    await testMockRequest('GET', 'v1/projects', { projects: [] }, 200);
});

it('Can make a POST request', async () => {
    await testMockRequest('POST', 'v1/projects/123', {}, 200);
});

it('Can make a PUT request', async () => {
    await testMockRequest('PUT', 'v1/test/123', {}, 200);
});

it('Can make a PATCH request', async () => {
    await testMockRequest('PATCH', 'v1/test/123', {}, 200);
});

it('Can make a DELETE request', async () => {
    await testMockRequest('DELETE', 'v1/projects/123/archive', {}, 200);
});

async function testMockRequest(method, endpoint, mockData, mockStatus = 200) {
    const expectedResponse: any = {
        status: mockStatus,
        json: async () => (mockData),
    };

    const expectedHeaders = {
        Accept: 'application/json',
        Authorization: 'Bearer aaa-bbb-ccc-ddd',
        'Content-Type': 'application/json',

        // Don't strictly check these values
        'X-Signature': expect.any(String),
        'X-Timestamp': expect.any(String),
    };

    const expectedOptions = {
        method,
        mode: 'no-cors',
        redirect: 'error',
    };

    global.fetch = vi.fn(fetch)
        .mockImplementation(async () => expectedResponse);

    const client = new DatanestClient("aaa-bbb-ccc-ddd", 'dddd-ccc-bbb-aaa');
    const response = await client[method.toLowerCase()](endpoint);

    expect(response).toEqual(expectedResponse);

    const baseUrl = (process.env.DATANEST_API_BASE_URL || 'https://app.datanest.earth/api')
        .replace(/\/$/, '');

    // Assert that global.fetch was called with the expected headers and options
    expect(global.fetch).toHaveBeenCalledWith(
        baseUrl + '/' + endpoint,
        {
            headers: expectedHeaders,
            ...expectedOptions,
        }
    );
}
