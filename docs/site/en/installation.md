# Installation and execution

**English** | [Português (Brasil)](../instalacao.md)

## Prerequisites

- Node.js 24 and npm for local execution.
- An existing, accessible RackTables MySQL/MariaDB database.
- Docker for container execution (optional).

Building and starting the application do not apply migrations automatically. This API connects to an existing RackTables database.

## Installation and configuration

**1. Clone the repository:**

```bash
git clone https://github.com/luisfilippe650/Racktables-api.git
cd Racktables-api
```

**2. Copy the example configuration:**

```bash
cp .env.example .env
```

Edit `.env` with your database settings:

```env
DATABASE_URL=mysql://rackuser:rackpass@127.0.0.1:3306/racktables
HOST=0.0.0.0
PORT=8000
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET
```

Generate a secret with `openssl rand -hex 32` and put the result in `JWT_SECRET`. The API requires at least 32 bytes for this secret.

Special characters in the username and password must be URL-encoded. `HOST` and `PORT` set the listening address; their defaults are `0.0.0.0` and `8000`.

**3. Install dependencies and generate Prisma Client:**

```bash
npm ci
npm run prisma:generate
```

Git ignores `.env`; `.env.example` and `package-lock.json` remain versioned.

## Running the API

**Development with automatic reload:**

```bash
npm run dev
```

**Type checking, compilation, and execution:**

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

The image generates Prisma Client, compiles TypeScript, and runs with production dependencies as an unprivileged user. The `.env` file is supplied at runtime.

Inside a container, `127.0.0.1` points to the container itself. For a database in another container, use the service name in `DATABASE_URL` and connect the API to the same network with `--network <network>`. For a database on a Linux host, add `--add-host=host.docker.internal:host-gateway` and use `host.docker.internal` in the URL. Adjust the database port for the selected address.

The API will be available at `http://localhost:8000`, with Swagger UI at `/v1/racktables/docs`.
