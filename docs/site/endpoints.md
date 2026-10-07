# Referência dos endpoints

Todas as rotas abaixo usam o prefixo **`/v1/racktables`**. Os parâmetros `{id}`, `{rowId}` e similares devem ser substituídos pelos IDs reais.

As entradas de schema fixo rejeitam campos desconhecidos com **400**. A atualização de objetos aceita também nomes de atributos dinâmicos. As respostas de sucesso retornam os dados diretamente, sem envelope global `status`, `message` e `data`.

As listagens paginadas de objetos, tipos e opções de dicionário aceitam `page` (1–1000) e `per_page` (1–100), com padrões 1 e 50. As listagens de racks e de ocupação de todos os racks também aceitam paginação, com `per_page` de até 100 e validação do limite de offset.

O formato das listagens paginadas é:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "per_page": 50
}
```

## Locations

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/locations` | Lista os locais |
| `GET` | `/location/{id}` | Consulta um local |
| `POST` | `/location` | Cria um local |
| `PATCH` | `/location/{id}` | Renomeia um local |
| `DELETE` | `/location/{id}` | Exclui um local |

**Corpo de criação ou atualização:**

```json
{ "name": "Sala de Servidores A" }
```

## Rows

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/rows` | Lista as filas |
| `GET` | `/row/{id}` | Consulta uma fila |
| `GET` | `/row/by-name?name={name}` | Consulta pelo nome |
| `POST` | `/row` | Cria uma fila |
| `PATCH` | `/row/{id}` | Renomeia uma fila |
| `DELETE` | `/row/{id}` | Exclui uma fila |
| `PATCH` | `/row/link/{rowId}/{locationId}` | Vincula a fila ao local |
| `PATCH` | `/row/unlink/{rowId}/{locationId}` | Remove o vínculo |

**Corpo de criação ou atualização:**

```json
{ "name": "Fila 01" }
```

## Racks

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/racks` | Lista os racks com paginação |
| `GET` | `/rack/{id}` | Consulta um rack |
| `GET` | `/rack/by-name?name={name}` | Consulta pelo nome |
| `POST` | `/rack` | Cria um rack |
| `PATCH` | `/rack/{id}` | Renomeia um rack |
| `DELETE` | `/rack/{id}` | Exclui um rack |
| `GET` | `/rack/{id}/details` | Consulta os detalhes do rack |
| `GET` | `/racks/occupancy` | Lista a ocupação dos racks com paginação |
| `GET` | `/rack/{id}/occupancy` | Consulta a ocupação de um rack |
| `GET` | `/rack/{id}/spaces` | Consulta os espaços do rack |
| `GET` | `/rack/{rackId}/spaces/{unitNo}/{atom}` | Consulta um espaço específico |
| `GET` | `/rack/{rackId}/objects/{objectId}/spaces` | Consulta os espaços ocupados pelo objeto |

`atom` aceita `front`, `interior` ou `rear`.

**Corpo de criação:**

```json
{
  "name": "Rack A1",
  "rack_height": 42,
  "row_id": 10,
  "asset_no": "PAT-001"
}
```

`name` e `row_id` são obrigatórios. `rack_height` é opcional, com padrão 42 e limite de 1000 unidades. `asset_no` é opcional. Para renomear, envie apenas `{ "name": "Novo nome" }`.

## Objects

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/objects` | Lista equipamentos com sua alocação |
| `GET` | `/objects/all?search={text}` | Lista objetos, incluindo locais, filas e racks; busca opcional |
| `GET` | `/object/{id}` | Consulta um objeto |
| `GET` | `/object/by-name?name={name}` | Consulta pelo nome |
| `GET` | `/object/by-service-tag?service_tag={tag}` | Consulta pela service tag |
| `GET` | `/objects/types` | Lista os tipos disponíveis |
| `GET` | `/objects/dictionary/{chapter_id}` | Lista opções de um capítulo do dicionário |
| `POST` | `/object` | Cria um equipamento |
| `PATCH` | `/object/{id}` | Atualiza campos fixos e atributos dinâmicos |
| `DELETE` | `/object/{id}` | Exclui um objeto |

**Corpo de criação:**

```json
{
  "name": "srv-prod-01",
  "objtype_id": 4,
  "label": "Servidor de produção",
  "asset_no": "PAT-0042",
  "comment": "Criado pela API"
}
```

`name` e `objtype_id` são obrigatórios; os demais campos são opcionais. O tipo deve ser permitido pela API. A criação retorna **201** com `{ object, ports_created }`.

A exclusão retorna **204**, sem corpo, e é bloqueada quando o objeto está montado, tem conexões físicas ou entidades filhas.

## Resumo e atributos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/object/{id}/summary?include_options=false` | Consulta o resumo e atributos do objeto |
| `PATCH` | `/object/{id}` | Atualiza os campos e atributos informados |

`include_options` é opcional e tem padrão `false`. Use `true` para incluir opções de atributos de dicionário.

**Corpo de atualização:**

```json
{
  "name": "srv-prod-01-renamed",
  "label": "Servidor de produção",
  "asset_no": "PAT-0042",
  "has_problems": false,
  "comment": "Atualizado pela API",
  "Serial": "SN123456",
  "OEM S/N 1": "ABC123"
}
```

Envie apenas os campos que deseja alterar. Os atributos dinâmicos devem existir e ser aplicáveis ao tipo do objeto. `id`, `object_id`, `objtype_id` e `Height, units` são imutáveis nessa operação.

Para limpar um atributo dinâmico, use:

```json
{ "Serial": { "clear": true } }
```

A atualização retorna `{ object, fixed_fields_updated, dynamic_attributes_updated }`.

## Alocações

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/object/mount` | Monta um equipamento no rack |
| `DELETE` | `/object/{id}/mount` | Desmonta um equipamento |

**Corpo de montagem — todos os campos são obrigatórios:**

```json
{
  "rack_id": 27,
  "object_id": 31,
  "start_unit": 10,
  "height": 2
}
```

`start_unit` é a unidade mais alta da alocação. A montagem segue em direção à U1: neste exemplo, ocupa U10 e U9. A altura não pode ultrapassar U1. Montagem e desmontagem retornam **200** com os detalhes da operação.

## Movimentação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/object/move` | Move um equipamento montado para outro rack |

**Corpo de movimentação — todos os campos são obrigatórios:**

```json
{
  "object_id": 31,
  "destination_rack_id": 35,
  "start_unit": 5
}
```

A origem e a altura são obtidas da alocação atual. `start_unit` indica a unidade mais alta no rack de destino. A operação retorna **200** com os detalhes da movimentação.

## Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/auth/login` | Obtém o token com as credenciais RackTables (público) |
| `GET` | `/auth/me` | Consulta o usuário do token (protegido) |

Veja o [guia de autenticação](autenticacao.md). Todas as rotas de dados exigem um token Bearer.
