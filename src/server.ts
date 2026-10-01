import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { racksRouter } from "./modules/racks/racks.router.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);
  registerErrorHandler(app);
  app.register(racksRouter);
  return app;
}

export const app = buildApp({ logger: true });
