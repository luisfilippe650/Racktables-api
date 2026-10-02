import { z } from "zod";
import {
  ObjectFieldsSchema,
  ObjectIdSchema,
} from "../../../shared/schemas/object.schema.js";

export const RowNameSchema = z
  .string()
  .trim()
  .pipe(ObjectFieldsSchema.shape.name);

export const RowSchema = z
  .object({
    name: RowNameSchema,
  })
  .strict();

export const RowWithLocationSchema = z
  .object({
    name: RowNameSchema,
    locationId: ObjectIdSchema,
  })
  .strict();

export const UpdateRowSchema = z
  .object({
    name: RowNameSchema,
  })
  .strict();

export const UpdateRowInputSchema = UpdateRowSchema.extend({
  id: ObjectIdSchema,
});

export const RowLocationParamsSchema = z
  .object({
    rowId: ObjectIdSchema,
    locationId: ObjectIdSchema,
  })
  .strict();

export type RowNameDTO = z.infer<typeof RowNameSchema>;
export type RowDTO = z.infer<typeof RowSchema>;
export type RowWithLocationDTO = z.infer<typeof RowWithLocationSchema>;
export type UpdateRowDTO = z.infer<typeof UpdateRowSchema>;
