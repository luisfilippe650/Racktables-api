# Exemplos de uso

Primeiro, siga o [guia de autenticação](autenticacao.md) e configure o token no terminal:

```bash
export TOKEN='COLE_AQUI_O_ACCESS_TOKEN'
```

Os IDs abaixo são ilustrativos. Substitua-os pelos IDs retornados pela sua instalação.

**Criar um local:**

```bash
curl -X POST http://localhost:8000/v1/racktables/location \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sala de Servidores A"}'
```

**Criar uma fila e vinculá-la ao local:**

```bash
curl -X POST http://localhost:8000/v1/racktables/row \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Fila 01"}'

curl -X PATCH http://localhost:8000/v1/racktables/row/link/10/29 \
  -H "Authorization: Bearer $TOKEN"
```

**Criar um rack e consultar sua ocupação:**

```bash
curl -X POST http://localhost:8000/v1/racktables/rack \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Rack A1","rack_height":42,"row_id":10,"asset_no":"PAT-001"}'

curl http://localhost:8000/v1/racktables/rack/27/occupancy \
  -H "Authorization: Bearer $TOKEN"
```

**Criar um servidor e montá-lo no rack:**

```bash
curl -X POST http://localhost:8000/v1/racktables/object \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"srv-prod-01","objtype_id":4,"label":"Servidor de produção"}'

curl -X POST http://localhost:8000/v1/racktables/object/mount \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"rack_id":27,"object_id":31,"start_unit":10,"height":2}'
```

**Listar equipamentos com paginação e consultar um resumo:**

```bash
curl 'http://localhost:8000/v1/racktables/objects?page=1&per_page=50' \
  -H "Authorization: Bearer $TOKEN"
curl 'http://localhost:8000/v1/racktables/object/31/summary?include_options=true' \
  -H "Authorization: Bearer $TOKEN"
```

**Atualizar campos fixos e atributos dinâmicos:**

```bash
curl -X PATCH http://localhost:8000/v1/racktables/object/31 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"srv-prod-01-renamed","has_problems":false,"Serial":"SN987654"}'
```

**Limpar um atributo dinâmico:**

```bash
curl -X PATCH http://localhost:8000/v1/racktables/object/31 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"Serial":{"clear":true}}'
```

**Mover o equipamento e desmontá-lo:**

```bash
curl -X POST http://localhost:8000/v1/racktables/object/move \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"object_id":31,"destination_rack_id":35,"start_unit":5}'

curl -X DELETE http://localhost:8000/v1/racktables/object/31/mount \
  -H "Authorization: Bearer $TOKEN"
```
