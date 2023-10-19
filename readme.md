# Datanest API Client for Node.js

Please see the [Datanest API documentation](docs/readme.md) for more information.

This is a Node JS implementation of [datanest.earth](https://datanest.earth)'s REST API client.
You should use this lightweight package to easily start using the API.

**If you are NOT using Node.js** you can use this package as [an implementation example](https://github.com/search?q=repo%3Adatanest-earth%2Fdatanest-nodejs-client+DatanestClient&type=code).

Please contact [hello@datanest.earth](mailto:hello@datanest.earth) to request an API key and Secret.


## Requirements

If you wish to use this Node package, you will need to have Node installed on your machine.

We recommend the latest stable version of Node.
- Tested on Node v20.8.0

Minimum requirements:
- Fetch API Node v18.0+ (unverified)
> [node-fetch](https://www.npmjs.com/package/node-fetch) may allow for earlier versions

## Authentication

Datanest's API uses API keys to authenticate requests along with a [HMAC signature (see implementation code.)](https://github.com/search?q=repo%3Adatanest-earth/datanest-nodejs-client%20signRequest&type=code) The signature may be tricky to implement, so we recommend using this package to get started.

The client will automatically look for a local `.env` file to get the API key and secret.

Place your API key in a .env
```env
DATANEST_API_KEY=your-api-key
DATANEST_API_SECRET=your-api-secret
```

Simply construct
```js
import DatanestClient from '@datanest-earth/nodejs-client';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

const client = new DatanestClient();
```

Alternatively use the constructor to pass the API key and secret.

```js
import DatanestClient from '@datanest-earth/nodejs-client';

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

## Example

```ts
import DatanestClient from '@datanest-earth/nodejs-client';
import dotenv from 'dotenv';

// Load .env
dotenv.config();

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
import DatanestClient from '@datanest-earth/nodejs-client';

const client = new DatanestClient();
client.setBaseUrl('https://app.datanest.earth');
```