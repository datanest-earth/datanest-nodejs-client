## Datanest Projects API

See [Authentication](../readme.md#authentication) for details on how to authenticate requests.

## Project Addresses

A `project_country` as a 2-char ISO code is required for project creation.

#### Option A: Full Address with lookup

Providing a full or partial address via `project_address`. This will trigger a lookup to fill in the address fields using best-effort via the Google Places API.

#### Option B: Full Address with components

You can provide the address components via the following fields:
```js
'address_street'
'address_locality'
'address_city'
'address_state'
'address_country'
'address_postcode'
```

You may include a `project_address` with the full address, or it will be constructed from the components above.

#### Option C: Latitude and Longitude
`latitude` and `longitude` can be used to specify the location of the project. This is useful when the address is not known.
If you do not provide an address the system will attempt to reverse geocode the lat/long to get an address. The address will not be overwritten.

If you do not provide an address, the lat/long can be looked up. 

### GET /v1/projects?page=1&latest=true

Returns a list of projects.

Optional Query Parameters:
- `page=2` number of page starting at 1
- `latest=true` show the latest projects first
- `archived=true` to return archived projects, instead of only active projects

#### Response Body

```json
{
    "data": Project[],
    "meta": {
        "current_page": number,
        "last_page": number,
        "per_page": number,
        "total": number,
    }
}
```

### GET /v1/projects/:uuid

Returns a single project.

#### Optional Query Parameters
`?allow-archived=true` to include archived projects.

#### Response Body

```json
{
    "project": Project,
    "project_link": "https://app.datanest.earth/open-project/{uuid}"
}
```

### DELETE /v1/projects/:uuid/archive

Archive a project to hide it from users. This is a soft delete, the project will be fully deleted after 6 months by default.

#### Response Body

```json
{
    "message" => "Project archived",
    "project": Project,
}
```

### POST /v1/projects/:uuid/restore

Restore a project.

#### Response Body

```json
{
    "message" => "Project restored",
    "project": Project,
}
```

### POST /v1/projects

Creates a new project.

#### Request Body

```json
{
    "project_number": "string",
    "project_name": "string",
    "project_client": "string",
    "project_address": "Full address",
}
```
See more project fields here: [Project](../../src/projects.ts)

#### Response Body

```json
{
    "project": Project,
    "project_link": "https://app.datanest.earth/open-project/:uuid"
}
```

See more project fields here: [Project](../../src/projects.ts)