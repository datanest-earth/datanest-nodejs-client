## Datanest Projects API

See [Authentication](../readme.md#authentication) for details on how to authenticate requests.

### GET /v1/projects?page=1

Returns a list of projects.
The `page` query parameter is optional.

`archived=true` query parameter can be added to return archived projects, instead of only active projects.

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
    "project": Project,
    "project_link": "https://app.datanest.earth/open-project/:uuid"
}
```
- [Project](../src/projects.ts)

#### Response Body

```json
{
    "project": Project,
    "project_link": "https://app.datanest.earth/open-project/:uuid"
}
```
- [Project](../src/projects.ts)
