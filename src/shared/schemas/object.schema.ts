import { z } from "zod";

export const ObjectFieldsSchema = z
  .object({
    name: z
      .string()
      .min(1, "You need to enter at least 1 character.")
      .max(255, "exceeded the limit"),
    label: z.string().max(255, "exceeded the limit").nullable().optional(),
    asset_no: z.string().max(64, "exceeded the limit").nullable().optional(),
    has_problems: z.enum(["yes", "no"]).optional(),
    comment: z.string().nullable().optional(),
  })
  .strict();

export const ObjectIdSchema = z.coerce.number().int().positive();

export const ObjectIdParamsSchema = z
  .object({
    id: ObjectIdSchema,
  })
  .strict();

export type ObjectFieldsDTO = z.infer<typeof ObjectFieldsSchema>;
export type ObjectIdDTO = z.infer<typeof ObjectIdParamsSchema>;
