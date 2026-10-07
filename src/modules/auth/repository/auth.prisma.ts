import { Prisma } from "../../../database/prisma.js";
import { executeDatabaseOperation } from "../../../shared/database/execute-database-operation.js";
import type { AuthUserEntity } from "../entity/auth.entity.js";
import { AuthRepository } from "./auth.repository.js";

export class AuthPrismaRepository extends AuthRepository {
  constructor(private readonly prisma: typeof Prisma = Prisma) {
    super();
  }

  async findByLogin(login: string): Promise<AuthUserEntity | null> {
    return executeDatabaseOperation(() =>
      this.prisma.userAccount.findUnique({
        where: { user_name: login },
        select: {
          user_id: true,
          user_name: true,
          user_password_hash: true,
        },
      }),
    );
  }
}
