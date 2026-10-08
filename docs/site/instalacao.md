# Instalação e execução

**Português (Brasil)** | [English](en/installation.md)

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
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO
```

Gere o segredo com `openssl rand -hex 32` e coloque o resultado em `JWT_SECRET`. A API exige pelo menos 32 bytes para esse segredo.

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
