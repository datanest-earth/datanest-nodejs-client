# Datanest Public API Documentation

Base URL: https://app.datanest.earth/api

> We can provide a staging environment for testing.

## Authentication

You need an `api key` and `api secret`
The API key is added as the `X-API-Key` header

The secret is used to sign the requests with a `X-Signature` header.

Along with an `X-Timestamp` of UNIX time in seconds since Jan 1, 1970.

The signature is a HMAC SHA256 of the following:

**GET & DELETE requests:**
{METHOD}:{fullUrl}:{timestamp}

**PUT / POST & PATCH requests:**
{METHOD}:{fullUrl}:{bodyContents}:{timestamp}

> `fullUrl` must have the query parameters in alphanumeric order. This must be in the exact format as provided in the request body.

> `bodyContents` is optional for POST, PUT and PATCH requests. This must match the request body exactly.

> GET and DELETE cannot have bodies.

**Good example:**
`GET:https://app.datanest.earth/api/v1/projects?alpha=1&beta=3:1697748031`

**Bad example:**
`get:https://APP.DATANEST.EARTH/API/V1/PROJECTS/?beta=3&alpha=1:1697748031`
> Method must be capitalized 

> URL domain should not be capitalized

> URL path should not be capitalized

> URL path should not have trailing slash

> Query params are not ordered

## Other Headers

We recommend using `Accept` and `Content-Type` headers with `application/json` value.

`X-Client-ID` is optional, but we recommend setting it to a unique identifier for your application. It can be useful to identify requests in our logs.

## Full Implementation Example

[See Client Implementation in Node.js](../src/index.ts)

## POSTMAN

[See Postman Collection](./postman/)

## Model Type Definitions

See Typescript type definitions:
- [Projects](../src/projects.ts)

## Endpoints

- [Projects API](./endpoints/projects.md)
