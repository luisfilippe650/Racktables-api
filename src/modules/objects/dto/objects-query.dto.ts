import { z } from "zod";
import { ObjectIdSchema, ObjectNameSchema } from "./objects-common.dto.js";

export const ObjectIdParamsSchema = z.object({ id: ObjectIdSchema }).strict();

export const ObjectNameQuerySchema = z
  .object({ name: ObjectNameSchema })
  .strict();

export const ObjectServiceTagQuerySchema = z
  .object({ service_tag: z.string().trim().min(1).max(64) })
  .strict();

export const ObjectListQuerySchema = z
  .object({
    page: z.coerce.number<number | string>().int().min(1).max(1000).default(1),
    per_page: z.coerce
      .number<number | string>()
      .int()
      .min(1)
      .max(100)
      .default(50),
  })
  .strict();

export const ObjectAllQuerySchema = ObjectListQuerySchema.extend({
  search: z.string().trim().max(255).optional(),
});

export const ObjectSummaryQuerySchema = z
  .object({
    include_options: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((value) => value === "true"),
      ])
      .default(false),
  })
  .strict();

export const DictionaryParamsSchema = z
  .object({ chapter_id: ObjectIdSchema })
  .strict();

export type ObjectListQueryDTO = z.input<typeof ObjectListQuerySchema>;
export type ObjectAllQueryDTO = z.input<typeof ObjectAllQuerySchema>;
export type ObjectServiceTagQueryDTO = z.input<
  typeof ObjectServiceTagQuerySchema
>;
export type ObjectSummaryQueryDTO = z.input<typeof ObjectSummaryQuerySchema>;
