import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { registerErrorHandler } from "./shared/errors/error-handler.js";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);
  registerErrorHandler(app);
  return app;
}

export const app = buildApp({ logger: true });
