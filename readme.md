# Datanest API Client for Node.js

This is a Node JS implementation of [datanest.earth](https://datanest.earth)'s REST API client.
You should use this lightweight package to easily start using the API.

If you are not using Node.js you can use this package as an implementation example.

Please contact [hello@datanest.earth](mailto:hello@datanest.earth) to request an API key and Secret.

## Requirements

We recommend the latest stable version of Node.
- Tested on Node v20.8.0

Minimum requirements:
- Fetch API Node v18.0+ (unverified)

## Authentication

Datanest's API uses API keys to authenticate requests along with a HMAC signature. The signature may be tricky to implement, so we recommend using this package to get started.

The client will automatically look for a local `.env` file to get the API key and secret.

Place your API key in a .env
```env
DATANEST_API_KEY=your-api-key
DATANEST_API_SECRET=your-api-secret
```


```js
import DatanestClient from 'datanest-api-client';

const client = new DatanestClient();
```

Alternatively use the constructor to pass the API key and secret.

```js
import DatanestClient from 'datanest-api-client';

const client = new DatanestClient('your-api-key', 'your-api-secret');
```

## Make GET, POST, PATCH, PUT, DELETE requests

The client exposes the following methods to make requests to the API.

```ts
client.get(path, params?: Record<string, any>, optionalFetchOptions);
client.post(path, params?: Record<string, any>, optionalFetchOptions);
client.patch(path, params?: Record<string, any>, optionalFetchOptions);
client.put(path, params?: Record<string, any>, optionalFetchOptions);
client.delete(path, params?: Record<string, any>, optionalFetchOptions);
```

The underlying fetch api is used, you can pass in any valid fetch options as the third argument. For example, to add a custom header.

See [fetch api "options" docs](https://developer.mozilla.org/en-US/docs/Web/API/fetch#options)

## Examples

```ts
async function listProjects() {
    const client = new DatanestClient();
    const response = await client.get('v1/projects');
    const projects = await response.json();
    console.log(projects);
}

listProjects();
```

## Testing

You can override the default API endpoint by setting the `DATANEST_API_BASE_URL` environment variable.

```env
DATANEST_API_BASE_URL=https://app.datanest.earth/api
```

Or in your code:

```ts
import DatanestClient from 'datanest-api-client';

const client = new DatanestClient();
client.setBaseUrl('https://app.datanest.earth');
```