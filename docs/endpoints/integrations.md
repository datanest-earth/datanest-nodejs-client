## Datanest Integrations API

See [Authentication](../readme.md#authentication) for details on how to authenticate requests.


### POST /v1/integrations/:integrationKey

Setup or override an integration

#### Request Body

```json
{
    "api_key": "YOUR_API_KEY", // optional, depending on the integration
    "access_token": "YOUR_ACCESS_TOKEN", // optional, depending on the integration
    "refresh_token": "YOUR_REFRESH_TOKEN", // optional, depending on the integration
    "service_url": "https://", // optional, depending on the integration, a default url is usually provided for production cloud services.
    // Contact datanest for specifics on the integration you want to use.
}
```
> Contact Datanest for a list of available integrations available to configure via the API


#### Response Status Codes

200 - Success
400 - Invalid integration key
422 - Invalid request body, missing or invalid fields
404 - Integration was not found or was already deleted


### DELETE /v1/integrations/:integrationKey

Remove an integration
> Contact datanest for a list of `:integrationKey`-s

#### Response Status Codes

200 - Success
400 - Invalid integration key
404 - Integration was not found or was already deleted
