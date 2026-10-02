import { pathToFileURL } from "node:url";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { racksRouter } from "./modules/racks/racks.router.js";
import { objectsRouter } from "./modules/objects/objects.router.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerSwagger } from "./plugins/swagger.js";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);
  registerErrorHandler(app);
  registerSwagger(app);
  app.register(racksRouter);
  app.register(objectsRouter);
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
