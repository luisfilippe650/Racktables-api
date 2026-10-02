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

Swagger: http://localhost:8000/docs. OpenAPI: http://localhost:8000/docs/json.

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

Os módulos registrados atualmente são racks e objects. Locations e rows têm código em `src/modules`, mas ainda não estão registrados no servidor. As rotas antigas da versão Python não se aplicam à versão atual.

## Rotas disponíveis

| Método | Rota |
| --- | --- |
| POST | `/rack` |
| GET, PATCH, DELETE | `/rack/:id` |
| GET | `/racks` |
| GET | `/rack/by-name` |
| GET | `/rack/:id/details` |
| GET | `/rack/:id/occupancy` |
| GET | `/racks/occupancy` |
| GET | `/rack/:id/spaces` |
| GET | `/rack/:rackId/spaces/:unitNo/:atom` |
| GET | `/rack/:rackId/objects/:objectId/spaces` |
| POST | `/object` |
| GET, PATCH, DELETE | `/object/:id` |
| GET | `/object/by-name?name=...` |
| GET | `/object/by-service-tag?service_tag=...` |
| GET | `/objects` |
| GET | `/objects/all?search=...` |
| GET | `/objects/types` |
| GET | `/object/:id/summary?include_options=false` |
| GET | `/objects/dictionary/:chapter_id` |
| POST | `/object/mount` |
| DELETE | `/object/:id/mount` |
| POST | `/object/move` |

As listagens de objects e as opções de dicionário aceitam `page` (1–1000) e `per_page` (1–100), com padrões 1 e 50, e retornam `{ items, total, page, per_page }`. `/objects` lista equipamentos com sua alocação; `/objects/all` inclui racks, rows e locations.

`POST /object` recebe `name`, `objtype_id` e, opcionalmente, `label`, `asset_no` e `comment`. Retorna 201 com `{ object, ports_created }`. `PATCH /object/:id` atualiza campos fixos e atributos dinâmicos por nome, retornando `{ object, fixed_fields_updated, dynamic_attributes_updated }`. Para limpar um atributo dinâmico, envie `{ "Nome do atributo": { "clear": true } }`. A exclusão retorna 204 e é bloqueada quando o objeto está montado, tem conexões físicas ou entidades filhas.

`POST /object/mount` recebe `{ rack_id, object_id, start_unit, height }`; `start_unit` é a unidade mais alta e a alocação segue em direção à U1. `POST /object/move` recebe `{ object_id, destination_rack_id, start_unit }` e descobre a altura a partir da alocação atual. Montagem, desmontagem e movimentação retornam 200 com os detalhes da operação.

O banco RackTables deve existir antes da execução. O build e a inicialização não aplicam migrations automaticamente.

## Arquivos locais

`.env`, `.agents`, `.codex`, `.idea`, `.vscode`, dependências e arquivos gerados são ignorados pelo Git. O `.env.example` e o `package-lock.json` permanecem versionados.
