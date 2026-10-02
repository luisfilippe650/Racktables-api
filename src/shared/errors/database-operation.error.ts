import { ApplicationError } from "./application.error.js";

export class DatabaseOperationError extends ApplicationError {
  constructor(cause: unknown) {
    super(
      "DATABASE_ERROR",
      500,
      "It was not possible to complete the database operation.",
      undefined,
      { cause },
    );
  }
}
