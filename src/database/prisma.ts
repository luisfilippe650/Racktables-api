import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { ENV } from "../config/env.js";

export function databaseConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: Number(url.port || 3306),
    allowPublicKeyRetrieval: true,
  };
}

const adapter = new PrismaMariaDb(databaseConfig(ENV.DATABASE_URL));

export const Prisma = new PrismaClient({
  adapter,
});
