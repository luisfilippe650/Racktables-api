import { ApplicationError } from "./application.error.js";

export class InvalidInputError extends ApplicationError {
  constructor(issues: unknown) {
    super("INVALID_INPUT", 400, "Invalid input.", { issues });
  }
}
