import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service.js";
import { LoginSchema, type LoginResponseDTO } from "./schemas/auth.dto.js";
import { validate } from "../../shared/validation/validate.js";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async login(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const input = validate(LoginSchema, request.body);
    const user = await this.service.login(input);
    const token = await reply.jwtSign({ sub: String(user.id), login: user.login }, { expiresIn: "1h" });
    const response: LoginResponseDTO = {
      access_token: token, token_type: "Bearer", expires_in: 3600, user,
    };
    return reply.header("Cache-Control", "no-store").send(response);
  }
}
