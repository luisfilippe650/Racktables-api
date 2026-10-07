# RackTables REST API

**Camada de integração para acesso programático ao banco de dados RackTables**

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL%20%2F%20MariaDB-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

> API REST em TypeScript com Fastify e Prisma que permite consultar e modificar o inventário diretamente em um banco MySQL/MariaDB do RackTables.
>
> Guias em português com Zensical: <http://localhost:8001>, após executar `npm run docs:dev`.
>
> Documentação interativa com Swagger: <http://localhost:8000/v1/racktables/docs>, com a API em execução. Especificação OpenAPI: <http://localhost:8000/v1/racktables/docs/json>.

---

## Índice

- [Sobre](#sobre)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e configuração](#instalação-e-configuração)
- [Execução](#execução)
- [Autenticação](#autenticação)
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
- [Site de documentação](#site-de-documentação)

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
| Swagger UI / OpenAPI | Referência interativa e contrato dos endpoints |
| Zensical | Site de documentação a partir de Markdown |
| Python | Ambiente da ferramenta de documentação |
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
│       ├── auth/
│       ├── locations/
│       ├── rows/
│       ├── racks/
│       └── objects/
├── prisma/                       # Schema, views e migrations
├── tests/                        # Testes existentes
├── docs/
│   ├── site/                     # Páginas Markdown publicadas pelo Zensical
│   │   └── architecture/         # Arquitetura dos racks
│   └── superpowers/              # Planos e especificações internos
├── .github/workflows/docs.yml    # Validação do site no GitHub Actions
├── zensical.toml                 # Configuração e navegação da documentação
├── requirements-docs.txt         # Dependências Python da documentação
├── .env.example                  # Modelo de configuração
├── Dockerfile
├── package.json
└── tsconfig.json
```

Os módulos organizam rotas, controllers, services e repositories; os módulos de inventário também incluem DTOs e definições de entidades e erros.

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
- Python 3.11 ou superior, com `pip` e `venv`, para editar ou gerar a documentação.

Os comandos de instalação e os scripts npm de documentação abaixo usam os caminhos de Linux/macOS. A documentação pode ser gerada sem executar a API ou conectar ao banco.

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
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO
```

Gere `JWT_SECRET` com `openssl rand -hex 32` e substitua o valor de exemplo.

Caracteres especiais no usuário e na senha devem ser codificados para URL. `HOST` e `PORT` definem o endereço de escuta; os padrões são `0.0.0.0` e `8000`.

**3. Instale as dependências e gere o Prisma Client:**

```bash
npm ci
npm run prisma:generate
```

O `.env` é ignorado pelo Git; o `.env.example` e o `package-lock.json` permanecem versionados.

## Execução

### API em desenvolvimento

```bash
npm run dev
```

A API inicia na porta definida em `PORT` (8000 por padrão). O Swagger é disponibilizado pelo mesmo processo. Para parar, pressione **Ctrl+C**.

O Zensical inicia separadamente com `npm run docs:dev`; veja [Site de documentação](#site-de-documentação).

### API compilada

```bash
npm run typecheck
npm run build
npm start
```

### API em Docker

```bash
docker build -t racktables-api .
docker run --rm --name racktables-api --env-file .env -p 8000:8000 racktables-api
```

A imagem gera o Prisma Client, compila o TypeScript e executa com dependências de produção como usuário sem privilégios. O `.env` é fornecido em tempo de execução.

Dentro do container, `127.0.0.1` aponta para o próprio container. Para um banco em outro container, use o nome do serviço na `DATABASE_URL` e conecte a API à mesma rede com `--network <rede>`. Para um banco no host Linux, adicione `--add-host=host.docker.internal:host-gateway` e use `host.docker.internal` na URL. Ajuste a porta do banco ao endereço escolhido.

A API estará disponível em `http://localhost:8000`, com Swagger UI em `/v1/racktables/docs`.

## Autenticação

Configure `JWT_SECRET` no `.env` com um segredo aleatório de pelo menos 32 bytes.
Gere um valor com `openssl rand -hex 32`. A API recusa iniciar sem esse segredo.

Faça login usando as credenciais existentes do RackTables:

```bash
curl -X POST http://localhost:8000/v1/racktables/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"sua-senha"}'
```

A resposta contém `access_token`, `token_type`, `expires_in` (3600 segundos)
e `user` (ID e login). Senhas e hashes não são retornados.
O hash SHA-1 existente é verificado por compatibilidade com o RackTables;
esse fluxo não cria usuários nem altera senhas no banco.

Envie o token em todas as requisições de dados, inclusive nos exemplos deste README:

```bash
curl http://localhost:8000/v1/racktables/auth/me \
  -H 'Authorization: Bearer SEU_TOKEN'
```

O login e `/v1/racktables/docs` (incluindo seus arquivos e especificações)
são públicos. Todas as rotas de dados exigem `Authorization: Bearer SEU_TOKEN`.
No Swagger, faça login em `/auth/login`, copie `access_token` e informe
o token no botão **Authorize** para testar as rotas protegidas.
Credenciais incorretas e tokens ausentes, inválidos ou expirados retornam `401`.
Todos os usuários autenticados acessam as rotas de dados; permissões do
RackCode não são avaliadas por esta API. Para encerrar a sessão, descarte o
token no cliente; ele continua válido até expirar.

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

Primeiro, siga o [guia de autenticação](docs/site/autenticacao.md) e configure o token no terminal:

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

## Códigos HTTP

| Código | Significado | Uso |
|---|---|---|
| `200` | OK | Consulta, atualização, montagem, desmontagem ou movimentação concluída |
| `201` | Created | Recurso criado |
| `204` | No Content | Exclusão ou alteração de vínculo concluída, sem corpo |
| `400` | Bad Request | Corpo, parâmetros, query ou atributos inválidos |
| `401` | Unauthorized | Credenciais incorretas ou token ausente, inválido ou expirado |
| `404` | Not Found | Recurso ou rota inexistente |
| `409` | Conflict | Conflito de nome, ocupação ou dependências do recurso |
| `413` | Payload Too Large | Corpo excede o limite do servidor |
| `415` | Unsupported Media Type | Tipo de conteúdo não suportado |
| `500` | Internal Server Error | Erro interno ou falha de operação no banco |

Os erros tratados pela aplicação normalmente incluem `code`, `message` e, quando disponíveis, `details`. Algumas validações nos controllers retornam `message` e `errors`.

## Site de documentação

O Zensical transforma o Markdown de `docs/site/` em um site de guias em português. A referência interativa dos endpoints continua disponível no Swagger da API.

### Instalar o Zensical

Execute na raiz do repositório, uma vez por ambiente:

```bash
python3 -m venv .venv-docs
.venv-docs/bin/python -m pip install -r requirements-docs.txt
```

O ambiente `.venv-docs` mantém a ferramenta e suas dependências separadas. Os scripts npm usam esse ambiente diretamente; não é necessário ativá-lo. Python é usado para a documentação, enquanto a API é executada com Node.js.

### Iniciar a prévia

```bash
npm run docs:dev
```

Abra <http://localhost:8001>. O Zensical permanece rodando nesse terminal e atualiza as páginas automaticamente quando você salva o Markdown. Para encerrar a prévia, pressione **Ctrl+C**.

**A documentação inicia somente quando você executa `npm run docs:dev`.** Executar `npm run dev` ou `npm start` inicia a API e seu Swagger, sem iniciar o Zensical.

Para usar os dois ao mesmo tempo, abra dois terminais na raiz do projeto:

```bash
# Terminal 1: API e Swagger na porta 8000
npm run dev
```

```bash
# Terminal 2: documentação Zensical na porta 8001
npm run docs:dev
```

A API usa a porta 8000 por padrão, definida por `PORT` no `.env`. A documentação usa a porta 8001, definida por `dev_addr` no `zensical.toml`. Os dois processos podem executar ao mesmo tempo.

### Comandos disponíveis

| Comando | O que faz | Endereço ou saída |
| --- | --- | --- |
| `npm run dev` | Inicia a API em desenvolvimento com recarga automática | `http://localhost:8000` |
| `npm run build` | Compila a API e encerra | `dist/` |
| `npm start` | Inicia a API já compilada | `http://localhost:8000` |
| `npm run docs:dev` | Inicia a prévia da documentação com atualização automática | `http://localhost:8001` |
| `npm run docs:build` | Valida e gera o site estático, depois encerra | `site/` |

### Gerar e publicar o site

```bash
npm run docs:build
```

Esse comando executa o build em modo estrito (`--strict`) e gera os arquivos em `site/`. Ele não inicia um servidor. A geração e a prévia dos guias não exigem a API ou o banco em execução; os testes de endpoints no Swagger exigem a API e acesso ao banco.

O workflow em `.github/workflows/docs.yml` valida a documentação em alterações dos arquivos de documentação e disponibiliza o site como artefato. A publicação automática em uma hospedagem ainda precisa ser configurada. Para publicar, hospede o conteúdo de `site/` e defina o endereço público em `site_url` no `zensical.toml`.

No Windows, instale usando `.venv-docs\Scripts\python.exe -m pip install -r requirements-docs.txt` após criar o ambiente com `python -m venv .venv-docs`. Execute `.venv-docs\Scripts\zensical.exe serve` para a prévia ou `.venv-docs\Scripts\zensical.exe build --strict` para gerar o site.

### Editar as páginas

- Edite os arquivos Markdown em [docs/site](docs/site/index.md).
- Adicione novas páginas à navegação em `zensical.toml`.
- Consulte o [guia de edição](docs/site/documentacao.md) e a [arquitetura dos racks](docs/site/architecture/racktables-racks.md).
- Execute `npm run docs:build` para validar antes de compartilhar as alterações.

O ambiente `.venv-docs/`, o cache e a saída `site/` são ignorados pelo Git e pelo build Docker. Planos internos em `docs/superpowers/` ficam fora das páginas publicadas.
