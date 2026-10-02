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

export const API_PREFIX = "/v1/racktables";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);
  registerErrorHandler(app);
  registerSwagger(app, `${API_PREFIX}/docs`);
  app.register(locationsRouter, { prefix: API_PREFIX });
  app.register(rowsRouter, { prefix: API_PREFIX });
  app.register(racksRouter, { prefix: API_PREFIX });
  app.register(objectsRouter, { prefix: API_PREFIX });
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
