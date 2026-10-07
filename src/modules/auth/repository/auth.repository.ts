import type { AuthUserEntity } from "../entity/auth.entity.js";

export abstract class AuthRepository {
  abstract findByLogin(login: string): Promise<AuthUserEntity | null>;
}
