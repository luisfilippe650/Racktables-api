import { DatabaseOperationError } from "../errors/database-operation.error.js";

const MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 25;

export type RetryDelay = (ms: number) => Promise<void>;

export const waitBeforeRetry: RetryDelay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }
  return undefined;
}

export async function executeDatabaseOperation<T>(
  operation: () => Promise<T>,
  retryDelay: RetryDelay = waitBeforeRetry,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (databaseErrorCode(error) === "P2034" && attempt < MAX_ATTEMPTS) {
        await retryDelay(INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      if (error instanceof DatabaseOperationError) throw error;
      throw new DatabaseOperationError(error);
    }
  }
}
