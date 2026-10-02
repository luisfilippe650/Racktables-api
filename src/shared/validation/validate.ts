import type { z } from "zod";
import { InvalidInputError } from "../errors/invalid-input.error.js";

/** Returns normalized schema output or an application error with validation details. */
export function validate<T extends z.ZodType>(
  schema: T,
  input: unknown,
  ErrorType: new (issues: unknown) => Error = InvalidInputError,
): z.output<T> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) throw new ErrorType(parsed.error.issues);

  return parsed.data;
}
