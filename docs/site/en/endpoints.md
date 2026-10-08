# Endpoint reference

**English** | [Português (Brasil)](../endpoints.md)

All routes below use the **`/v1/racktables`** prefix. Replace `{id}`, `{rowId}`, and similar parameters with actual IDs.

Fixed-schema inputs reject unknown fields with **400**. Object updates also accept dynamic attribute names. Successful responses return data directly, without a global `status`, `message`, and `data` envelope.

Paginated object, type, and dictionary option lists accept `page` (1–1000) and `per_page` (1–100), defaulting to 1 and 50. Rack lists and occupancy lists for all racks also accept pagination, with `per_page` up to 100 and offset limit validation.

Paginated lists use this format:

```json
{ "items": [], "total": 0, "page": 1, "per_page": 50 }
```

## Locations

| Method | Route | Description |
|---|---|---|
| `GET` | `/locations` | List locations |
| `GET` | `/location/{id}` | Get a location |
| `POST` | `/location` | Create a location |
| `PATCH` | `/location/{id}` | Rename a location |
| `DELETE` | `/location/{id}` | Delete a location |

**Creation or update body:**

```json
{ "name": "Server Room A" }
```

## Rows

| Method | Route | Description |
|---|---|---|
| `GET` | `/rows` | List rows |
| `GET` | `/row/{id}` | Get a row |
| `GET` | `/row/by-name?name={name}` | Find by name |
| `POST` | `/row` | Create a row |
| `PATCH` | `/row/{id}` | Rename a row |
| `DELETE` | `/row/{id}` | Delete a row |
| `PATCH` | `/row/link/{rowId}/{locationId}` | Link the row to the location |
| `PATCH` | `/row/unlink/{rowId}/{locationId}` | Remove the link |

**Creation or update body:**

```json
{ "name": "Row 01" }
```

## Racks

| Method | Route | Description |
|---|---|---|
| `GET` | `/racks` | List racks with pagination |
| `GET` | `/rack/{id}` | Get a rack |
| `GET` | `/rack/by-name?name={name}` | Find by name |
| `POST` | `/rack` | Create a rack |
| `PATCH` | `/rack/{id}` | Rename a rack |
| `DELETE` | `/rack/{id}` | Delete a rack |
| `GET` | `/rack/{id}/details` | Get rack details |
| `GET` | `/racks/occupancy` | List rack occupancy with pagination |
| `GET` | `/rack/{id}/occupancy` | Get rack occupancy |
| `GET` | `/rack/{id}/spaces` | Get rack spaces |
| `GET` | `/rack/{rackId}/spaces/{unitNo}/{atom}` | Get a specific space |
| `GET` | `/rack/{rackId}/objects/{objectId}/spaces` | Get spaces occupied by an object |

`atom` accepts `front`, `interior`, or `rear`.

**Creation body:**

```json
{ "name": "Rack A1", "rack_height": 42, "row_id": 10, "asset_no": "PAT-001" }
```

`name` and `row_id` are required. `rack_height` is optional, defaults to 42, and is limited to 1000 units. `asset_no` is optional. To rename, send only `{ "name": "New name" }`.

## Objects

| Method | Route | Description |
|---|---|---|
| `GET` | `/objects` | List equipment and its placement |
| `GET` | `/objects/all?search={text}` | List objects, including locations, rows, and racks; optional search |
| `GET` | `/object/{id}` | Get an object |
| `GET` | `/object/by-name?name={name}` | Find by name |
| `GET` | `/object/by-service-tag?service_tag={tag}` | Find by service tag |
| `GET` | `/objects/types` | List available types |
| `GET` | `/objects/dictionary/{chapter_id}` | List options from a dictionary chapter |
| `POST` | `/object` | Create equipment |
| `PATCH` | `/object/{id}` | Update fixed fields and dynamic attributes |
| `DELETE` | `/object/{id}` | Delete an object |

**Creation body:**

```json
{
  "name": "srv-prod-01",
  "objtype_id": 4,
  "label": "Production server",
  "asset_no": "PAT-0042",
  "comment": "Created by the API"
}
```

`name` and `objtype_id` are required; other fields are optional. The type must be allowed by the API. Creation returns **201** with `{ object, ports_created }`.

Deletion returns **204** without a body and is blocked when the object is mounted, has physical connections, or has child entities.

## Summary and attributes

| Method | Route | Description |
|---|---|---|
| `GET` | `/object/{id}/summary?include_options=false` | Get the object summary and attributes |
| `PATCH` | `/object/{id}` | Update the supplied fields and attributes |

`include_options` is optional and defaults to `false`. Use `true` to include dictionary attribute options.

**Update body:**

```json
{
  "name": "srv-prod-01-renamed",
  "label": "Production server",
  "asset_no": "PAT-0042",
  "has_problems": false,
  "comment": "Updated by the API",
  "Serial": "SN123456",
  "OEM S/N 1": "ABC123"
}
```

Send only the fields you want to change. Dynamic attributes must exist and apply to the object's type. `id`, `object_id`, `objtype_id`, and `Height, units` are immutable in this operation.

To clear a dynamic attribute, use:

```json
{ "Serial": { "clear": true } }
```

Updates return `{ object, fixed_fields_updated, dynamic_attributes_updated }`.

## Placement

| Method | Route | Description |
|---|---|---|
| `POST` | `/object/mount` | Mount equipment in a rack |
| `DELETE` | `/object/{id}/mount` | Unmount equipment |

**Mounting body — all fields are required:**

```json
{ "rack_id": 27, "object_id": 31, "start_unit": 10, "height": 2 }
```

`start_unit` is the highest unit of the placement. Mounting proceeds toward U1: this example occupies U10 and U9. The height must not extend below U1. Mounting and unmounting return **200** with operation details.

## Moving equipment

| Method | Route | Description |
|---|---|---|
| `POST` | `/object/move` | Move mounted equipment to another rack |

**Move body — all fields are required:**

```json
{ "object_id": 31, "destination_rack_id": 35, "start_unit": 5 }
```

The source and height are obtained from the current placement. `start_unit` is the highest unit in the destination rack. The operation returns **200** with move details.

## Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Obtain a token using RackTables credentials (public) |
| `GET` | `/auth/me` | Get the token's user (protected) |

See the [authentication guide](authentication.md). All data routes require a Bearer token.
