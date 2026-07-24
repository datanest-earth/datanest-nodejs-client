import { it, expect, mock } from 'bun:test';
import DatanestClient from '../src';
import { getProject } from '../src/projects';

it('URL-encodes project identifiers so reserved characters cannot reshape the request path', async () => {
    const client = new DatanestClient('test-key', 'test-secret');
    const get = mock(async (_path: string) => ({
        json: async () => ({
            project: {},
            workflow: null,
            project_link: '',
            collection_link: '',
        }),
    }));
    // @ts-expect-error
    client.get = get as typeof client.get;

    const maliciousId = 'proj/../other?injected=1#frag';
    await getProject(client, maliciousId);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('v1/projects/' + encodeURIComponent(maliciousId));
    expect(get.mock.calls[0][0]).not.toContain('../');
    expect(get.mock.calls[0][0]).not.toContain('?');
    expect(get.mock.calls[0][0]).not.toContain('#');
});

it('leaves UUID path segments unchanged after encoding', async () => {
    const client = new DatanestClient('test-key', 'test-secret');
    const get = mock(async (_path: string) => ({
        json: async () => ({
            project: {},
            workflow: null,
            project_link: '',
            collection_link: '',
        }),
    }));
    // @ts-expect-error
    client.get = get as typeof client.get;

    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    await getProject(client, uuid);

    expect(get.mock.calls[0][0]).toBe('v1/projects/' + uuid);
});
