<div align="center">

# RackTables REST API

**Camada de integração para acesso programático ao banco de dados RackTables**

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL%20%2F%20MariaDB-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

> API REST em TypeScript com Fastify e Prisma que permite consultar e modificar o inventário diretamente em um banco MySQL/MariaDB do RackTables.
>
> Documentação interativa: `http://localhost:8000/v1/racktables/docs`. Especificação OpenAPI: `http://localhost:8000/v1/racktables/docs/json`.

---

## Índice

- [Sobre](#sobre)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e configuração](#instalação-e-configuração)
- [Execução](#execução)
- [Endpoints](#endpoints)
  - [Locations](#locations)
  - [Rows](#rows)
  - [Racks](#racks)
  - [Objects](#objects)
  - [Resumo e atributos](#resumo-e-atributos)
  - [Alocações](#alocações)
  - [Movimentação](#movimentação)
- [Exemplos de uso](#exemplos-de-uso)
- [Códigos HTTP](#códigos-http)

---

## Sobre

Desenvolvida no **INPE — Instituto Nacional de Pesquisas Espaciais**, a RackTables REST API oferece endpoints para integração e automação do inventário de infraestrutura do [RackTables](https://racktables.org/).

Os recursos disponíveis incluem locais físicos, filas de racks, racks, equipamentos, atributos dinâmicos, montagem, desmontagem e movimentação de equipamentos entre racks. A licença declarada no `package.json` é ISC.

## Tecnologias

| Tecnologia | Finalidade |
|---|---|
| Node.js 24 | Ambiente de execução |
| TypeScript | Linguagem principal |
| Fastify 5 | Servidor HTTP e roteamento |
| Prisma 7 | Acesso ao banco de dados |
| MySQL / MariaDB | Banco de dados RackTables |
| Zod | Validação de entradas |
| Swagger UI / OpenAPI | Documentação dos endpoints |
| dotenv | Carregamento das variáveis de ambiente |
| Docker | Empacotamento e execução em container |

## Estrutura do projeto

```text
Racktables-api/
├── src/
│   ├── server.ts                 # Inicialização e registro das rotas
│   ├── config/                   # Configuração do ambiente
│   ├── database/                 # Conexão Prisma
│   ├── plugins/                  # Swagger e schemas de entrada
│   ├── shared/                   # Entidades, validação e erros comuns
│   └── modules/
│       ├── locations/
│       ├── rows/
│       ├── racks/
│       └── objects/
├── prisma/                       # Schema, views e migrations
├── tests/                        # Testes existentes
├── docs/                         # Documentação complementar
├── .env.example                  # Modelo de configuração
├── Dockerfile
├── package.json
└── tsconfig.json
```

Cada módulo contém rotas, controller, service, repository, DTOs e definições de entidades e erros.

**Fluxo de uma requisição:**

```text
Cliente HTTP → Router → Controller (validação)
                      → Service (regras de negócio)
                      → Repository (acesso via Prisma)
                      → Banco MySQL/MariaDB do RackTables
```

## Pré-requisitos

- Node.js 24 e npm para execução local.
- Banco MySQL/MariaDB do RackTables existente e acessível.
- Docker para execução em container (opcional).

O build e a inicialização não aplicam migrations automaticamente. Esta API se conecta ao banco RackTables existente.

## Instalação e configuração

**1. Clone o repositório:**

```bash
git clone https://github.com/luisfilippe650/Racktables-api.git
cd Racktables-api
```

**2. Copie a configuração de exemplo:**

```bash
cp .env.example .env
```

Edite o `.env` com os dados do seu banco:

```env
DATABASE_URL=mysql://rackuser:rackpass@127.0.0.1:3306/racktables
HOST=0.0.0.0
PORT=8000
```

Caracteres especiais no usuário e na senha devem ser codificados para URL. `HOST` e `PORT` definem o endereço de escuta; os padrões são `0.0.0.0` e `8000`.

**3. Instale as dependências e gere o Prisma Client:**

```bash
npm ci
npm run prisma:generate
```

O `.env` é ignorado pelo Git; o `.env.example` e o `package-lock.json` permanecem versionados.

## Execução

**Desenvolvimento, com recarga automática:**

```bash
npm run dev
```

**Verificação de tipos, compilação e execução:**

```bash
npm run typecheck
npm run build
npm start
```

**Docker:**

```bash
docker build -t racktables-api .
docker run --rm --name racktables-api --env-file .env -p 8000:8000 racktables-api
```

A imagem gera o Prisma Client, compila o TypeScript e executa com dependências de produção como usuário sem privilégios. O `.env` é fornecido em tempo de execução.

Dentro do container, `127.0.0.1` aponta para o próprio container. Para um banco em outro container, use o nome do serviço na `DATABASE_URL` e conecte a API à mesma rede com `--network <rede>`. Para um banco no host Linux, adicione `--add-host=host.docker.internal:host-gateway` e use `host.docker.internal` na URL. Ajuste a porta do banco ao endereço escolhido.

A API estará disponível em `http://localhost:8000`, com Swagger UI em `/v1/racktables/docs`.

## Endpoints

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

### Locations

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

### Rows

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

### Racks

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

### Objects

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

### Resumo e atributos

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

### Alocações

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

### Movimentação

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

## Exemplos de uso

Os IDs abaixo são ilustrativos. Substitua-os pelos IDs retornados pela sua instalação.

**Criar um local:**

```bash
curl -X POST http://localhost:8000/v1/racktables/location \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sala de Servidores A"}'
```

**Criar uma fila e vinculá-la ao local:**

```bash
curl -X POST http://localhost:8000/v1/racktables/row \
  -H 'Content-Type: application/json' \
  -d '{"name":"Fila 01"}'

curl -X PATCH http://localhost:8000/v1/racktables/row/link/10/29
```

**Criar um rack e consultar sua ocupação:**

```bash
curl -X POST http://localhost:8000/v1/racktables/rack \
  -H 'Content-Type: application/json' \
  -d '{"name":"Rack A1","rack_height":42,"row_id":10,"asset_no":"PAT-001"}'

curl http://localhost:8000/v1/racktables/rack/27/occupancy
```

**Criar um servidor e montá-lo no rack:**

```bash
curl -X POST http://localhost:8000/v1/racktables/object \
  -H 'Content-Type: application/json' \
  -d '{"name":"srv-prod-01","objtype_id":4,"label":"Servidor de produção"}'

curl -X POST http://localhost:8000/v1/racktables/object/mount \
  -H 'Content-Type: application/json' \
  -d '{"rack_id":27,"object_id":31,"start_unit":10,"height":2}'
```

**Listar equipamentos com paginação e consultar um resumo:**

```bash
curl 'http://localhost:8000/v1/racktables/objects?page=1&per_page=50'
curl 'http://localhost:8000/v1/racktables/object/31/summary?include_options=true'
```

**Atualizar campos fixos e atributos dinâmicos:**

```bash
curl -X PATCH http://localhost:8000/v1/racktables/object/31 \
  -H 'Content-Type: application/json' \
  -d '{"name":"srv-prod-01-renamed","has_problems":false,"Serial":"SN987654"}'
```

**Limpar um atributo dinâmico:**

```bash
curl -X PATCH http://localhost:8000/v1/racktables/object/31 \
  -H 'Content-Type: application/json' \
  -d '{"Serial":{"clear":true}}'
```

**Mover o equipamento e desmontá-lo:**

```bash
curl -X POST http://localhost:8000/v1/racktables/object/move \
  -H 'Content-Type: application/json' \
  -d '{"object_id":31,"destination_rack_id":35,"start_unit":5}'

curl -X DELETE http://localhost:8000/v1/racktables/object/31/mount
```

## Códigos HTTP

| Código | Significado | Uso |
|---|---|---|
| `200` | OK | Consulta, atualização, montagem, desmontagem ou movimentação concluída |
| `201` | Created | Recurso criado |
| `204` | No Content | Exclusão ou alteração de vínculo concluída, sem corpo |
| `400` | Bad Request | Corpo, parâmetros, query ou atributos inválidos |
| `404` | Not Found | Recurso ou rota inexistente |
| `409` | Conflict | Conflito de nome, ocupação ou dependências do recurso |
| `413` | Payload Too Large | Corpo excede o limite do servidor |
| `415` | Unsupported Media Type | Tipo de conteúdo não suportado |
| `500` | Internal Server Error | Erro interno ou falha de operação no banco |

Os erros tratados pela aplicação normalmente incluem `code`, `message` e, quando disponíveis, `details`. Algumas validações nos controllers retornam `message` e `errors`.

---

<div align="center">
Desenvolvida para gestão de inventário de infraestrutura no <strong>INPE — Instituto Nacional de Pesquisas Espaciais</strong>
</div>
