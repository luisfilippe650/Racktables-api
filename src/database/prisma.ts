import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { ENV } from "../config/env.js";

const env = new URL(ENV.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: env.hostname,
  database: env.pathname,
  user: env.username,
  password: env.password,
  port: Number(env.port),
  allowPublicKeyRetrieval: true,
});

export const Prisma = new PrismaClient({
    adapter,
})
