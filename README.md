# RackTables API

API em TypeScript com Fastify, Prisma e MySQL/MariaDB para um banco RackTables existente.

## Executar localmente

Requisitos: Node.js 24, npm e acesso ao banco RackTables.

```bash
cp .env.example .env
npm ci
npm run prisma:generate
npm run dev
```

Configure `DATABASE_URL` no `.env` com as credenciais reais. Caracteres especiais no usuário e na senha devem ser codificados para URL. `HOST` e `PORT` definem o endereço de escuta (padrões: `0.0.0.0` e `8000`).

```bash
npm run typecheck
npm run build
npm start
```

Swagger: http://localhost:8000/v1/racktables/docs. OpenAPI: http://localhost:8000/v1/racktables/docs/json.

## Docker

```bash
docker build -t racktables-api .
docker run --rm --name racktables-api --env-file .env -p 8000:8000 racktables-api
```

A imagem gera o Prisma Client, compila o TypeScript e executa apenas as dependências de produção, como usuário sem privilégios. O `.env` é fornecido em tempo de execução.

Dentro do container, `127.0.0.1` aponta para o próprio container. Para um banco em outro container, use o nome do serviço na `DATABASE_URL` e conecte a API à mesma rede com `--network <rede>`. Para um banco no host Linux, adicione `--add-host=host.docker.internal:host-gateway` e use `host.docker.internal` na URL. A porta do banco deve corresponder ao endereço escolhido.

## Estrutura

- `src/server.ts`: aplicação Fastify e inicialização HTTP.
- `src/modules/`: controllers, services, repositories, DTOs e rotas.
- `src/config/` e `src/database/`: ambiente e conexão Prisma.
- `prisma/`: schema, views e migrations.
- `tests/`: testes existentes.

Os módulos locations, rows, racks e objects estão registrados no servidor com o prefixo `/v1/racktables`. As rotas antigas da versão Python não se aplicam à versão atual.

## Rotas disponíveis

| Método | Rota |
| --- | --- |
| POST | `/v1/racktables/location` |
| GET, PATCH, DELETE | `/v1/racktables/location/:id` |
| GET | `/v1/racktables/locations` |
| POST | `/v1/racktables/row` |
| GET, PATCH, DELETE | `/v1/racktables/row/:id` |
| GET | `/v1/racktables/row/by-name?name=...` |
| GET | `/v1/racktables/rows` |
| PATCH | `/v1/racktables/row/link/:rowId/:locationId` |
| PATCH | `/v1/racktables/row/unlink/:rowId/:locationId` |
| POST | `/v1/racktables/rack` |
| GET, PATCH, DELETE | `/v1/racktables/rack/:id` |
| GET | `/v1/racktables/racks` |
| GET | `/v1/racktables/rack/by-name` |
| GET | `/v1/racktables/rack/:id/details` |
| GET | `/v1/racktables/rack/:id/occupancy` |
| GET | `/v1/racktables/racks/occupancy` |
| GET | `/v1/racktables/rack/:id/spaces` |
| GET | `/v1/racktables/rack/:rackId/spaces/:unitNo/:atom` |
| GET | `/v1/racktables/rack/:rackId/objects/:objectId/spaces` |
| POST | `/v1/racktables/object` |
| GET, PATCH, DELETE | `/v1/racktables/object/:id` |
| GET | `/v1/racktables/object/by-name?name=...` |
| GET | `/v1/racktables/object/by-service-tag?service_tag=...` |
| GET | `/v1/racktables/objects` |
| GET | `/v1/racktables/objects/all?search=...` |
| GET | `/v1/racktables/objects/types` |
| GET | `/v1/racktables/object/:id/summary?include_options=false` |
| GET | `/v1/racktables/objects/dictionary/:chapter_id` |
| POST | `/v1/racktables/object/mount` |
| DELETE | `/v1/racktables/object/:id/mount` |
| POST | `/v1/racktables/object/move` |

As listagens de objects e as opções de dicionário aceitam `page` (1–1000) e `per_page` (1–100), com padrões 1 e 50, e retornam `{ items, total, page, per_page }`. `/v1/racktables/objects` lista equipamentos com sua alocação; `/v1/racktables/objects/all` inclui racks, rows e locations.

`POST /v1/racktables/object` recebe `name`, `objtype_id` e, opcionalmente, `label`, `asset_no` e `comment`. Retorna 201 com `{ object, ports_created }`. `PATCH /v1/racktables/object/:id` atualiza campos fixos e atributos dinâmicos por nome, retornando `{ object, fixed_fields_updated, dynamic_attributes_updated }`. Para limpar um atributo dinâmico, envie `{ "Nome do atributo": { "clear": true } }`. A exclusão retorna 204 e é bloqueada quando o objeto está montado, tem conexões físicas ou entidades filhas.

`POST /v1/racktables/object/mount` recebe `{ rack_id, object_id, start_unit, height }`; `start_unit` é a unidade mais alta e a alocação segue em direção à U1. `POST /v1/racktables/object/move` recebe `{ object_id, destination_rack_id, start_unit }` e descobre a altura a partir da alocação atual. Montagem, desmontagem e movimentação retornam 200 com os detalhes da operação.

O banco RackTables deve existir antes da execução. O build e a inicialização não aplicam migrations automaticamente.

## Arquivos locais

`.env`, `.agents`, `.codex`, `.idea`, `.vscode`, dependências e arquivos gerados são ignorados pelo Git. O `.env.example` e o `package-lock.json` permanecem versionados.
