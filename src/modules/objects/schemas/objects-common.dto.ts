import { z } from "zod";

export const UINT_MAX = 4_294_967_295;

export const ObjectIdSchema = z.coerce.number().int().positive().max(UINT_MAX);

export const ObjectNameSchema = z.string().trim().min(1).max(255);

export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const ObjectActorSchema = z.string().trim().min(1).max(64).nullable();

export type ObjectIdDTO = z.output<typeof ObjectIdSchema>;
export type ObjectNameDTO = z.input<typeof ObjectNameSchema>;
export type ObjectActorDTO = z.input<typeof ObjectActorSchema>;

export function toBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === 0) return value === 1;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(text)) return true;
    if (["0", "false", "no", "n", "off"].includes(text)) return false;
  }
  return null;
}
