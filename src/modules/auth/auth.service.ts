import { createHash, timingSafeEqual } from "node:crypto";
import type { AuthRepository } from "./repository/auth.repository.js";
import { LoginSchema, type LoginDTO, type AuthUserDTO } from "./schemas/auth.dto.js";
import { validate } from "../../shared/validation/validate.js";
import { ApplicationError } from "../../shared/errors/application.error.js";

class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super("INVALID_CREDENTIALS", 401, "Login ou senha inválidos.");
  }
}

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async login(input: LoginDTO): Promise<AuthUserDTO> {
    const { login, password } = validate(LoginSchema, input);

    const user = await this.repository.findByLogin(login);

    // Compatibilidade com UserAccount do RackTables: SHA-1, não texto puro.
    const hash = createHash("sha1").update(password, "utf8").digest();

    const stored = user?.user_password_hash;

    const validHash = typeof stored === "string" && /^[a-f0-9]{40}$/i.test(stored);

    const matches = timingSafeEqual(hash, validHash ? Buffer.from(stored, "hex") : Buffer.alloc(20));

    if (!user || !validHash || !matches) throw new InvalidCredentialsError();
    return { id: user.user_id, login: user.user_name };
  }
}
