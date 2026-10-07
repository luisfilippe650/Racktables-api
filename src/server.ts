import { pathToFileURL } from "node:url";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { locationsRouter } from "./modules/locations/locations.router.js";
import { rowsRouter } from "./modules/rows/rows.routers.js";
import { racksRouter } from "./modules/racks/racks.router.js";
import { objectsRouter } from "./modules/objects/objects.router.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerSwagger } from "./plugins/swagger.js";
import { authenticate } from "./plugins/authenticate.js";
import jwt from "@fastify/jwt";
import { authRouter } from "./modules/auth/auth.router.js";
import type { AuthRepository } from "./modules/auth/repository/auth.repository.js";

export const API_PREFIX = "/v1/racktables";

export function buildApp(options: FastifyServerOptions = {}, auth: { jwtSecret?: string; authRepository?: AuthRepository } = {}): FastifyInstance {
  const app = Fastify(options);
  registerErrorHandler(app);
  registerSwagger(app, `${API_PREFIX}/docs`);

  app.register(async (api) => {

    const secret = auth.jwtSecret ?? process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new Error("JWT_SECRET deve ter pelo menos 32 bytes.");
    }

    await api.register(jwt, { secret, sign: { algorithm: "HS256" }, verify: { algorithms: ["HS256"] } });
    api.addHook("onRequest", async (request, reply) => {
      if (request.method === "POST" && request.routeOptions.url === `${API_PREFIX}/auth/login`) return;
      return authenticate(request, reply);
    });
    api.register(authRouter, { repository: auth.authRepository });
    api.register(async (protectedApi) => {
      protectedApi.register(locationsRouter);
      protectedApi.register(rowsRouter);
      protectedApi.register(racksRouter);
      protectedApi.register(objectsRouter);
    });
  }, { prefix: API_PREFIX });
  return app;
}

export const app = buildApp({ logger: true });

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await app.listen({
      host: process.env.HOST ?? "0.0.0.0",
      port: Number(process.env.PORT ?? 8000),
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
