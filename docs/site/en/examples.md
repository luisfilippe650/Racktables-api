# Usage examples

**English** | [Português (Brasil)](../exemplos.md)

First, follow the [authentication guide](authentication.md) and set the token in your terminal:

```bash
export TOKEN='PASTE_YOUR_ACCESS_TOKEN_HERE'
```

The IDs below are examples. Replace them with IDs returned by your installation.

**Create a location:**

```bash
curl -X POST http://localhost:8000/v1/racktables/location \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Server Room A"}'
```

**Create a row and link it to the location:**

```bash
curl -X POST http://localhost:8000/v1/racktables/row \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Row 01"}'

curl -X PATCH http://localhost:8000/v1/racktables/row/link/10/29 \
  -H "Authorization: Bearer $TOKEN"
```

**Create a rack and query its occupancy:**

```bash
curl -X POST http://localhost:8000/v1/racktables/rack \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Rack A1","rack_height":42,"row_id":10,"asset_no":"PAT-001"}'

curl http://localhost:8000/v1/racktables/rack/27/occupancy \
  -H "Authorization: Bearer $TOKEN"
```

**Create a server and mount it in the rack:**

```bash
curl -X POST http://localhost:8000/v1/racktables/object \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"srv-prod-01","objtype_id":4,"label":"Production server"}'

curl -X POST http://localhost:8000/v1/racktables/object/mount \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"rack_id":27,"object_id":31,"start_unit":10,"height":2}'
```

**List equipment with pagination and query a summary:**

```bash
curl 'http://localhost:8000/v1/racktables/objects?page=1&per_page=50' \
  -H "Authorization: Bearer $TOKEN"
curl 'http://localhost:8000/v1/racktables/object/31/summary?include_options=true' \
  -H "Authorization: Bearer $TOKEN"
```

**Update fixed fields and dynamic attributes:**

```bash
curl -X PATCH http://localhost:8000/v1/racktables/object/31 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"srv-prod-01-renamed","has_problems":false,"Serial":"SN987654"}'
```

**Clear a dynamic attribute:**

```bash
curl -X PATCH http://localhost:8000/v1/racktables/object/31 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"Serial":{"clear":true}}'
```

**Move and unmount equipment:**

```bash
curl -X POST http://localhost:8000/v1/racktables/object/move \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"object_id":31,"destination_rack_id":35,"start_unit":5}'

curl -X DELETE http://localhost:8000/v1/racktables/object/31/mount \
  -H "Authorization: Bearer $TOKEN"
```
