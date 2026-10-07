import type { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AuthPrismaRepository } from "./repository/auth.prisma.js";
import type { AuthRepository } from "./repository/auth.repository.js";
import { authenticate } from "../../plugins/authenticate.js";

export async function authRouter(app: FastifyInstance, options: { repository?: AuthRepository }) {
  const controller = new AuthController(new AuthService(options.repository ?? new AuthPrismaRepository()));
  app.post("/auth/login", { schema: { tags: ["Auth"], security: [] } }, (request, reply) => controller.login(request, reply));
  app.get("/auth/me", { onRequest: authenticate, schema: { tags: ["Auth"] } }, async (request) => ({
    id: Number(request.user.sub), login: request.user.login,
  }));
}
