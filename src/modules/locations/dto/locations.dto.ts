import { z } from "zod";
import {
  ObjectFieldsSchema,
  ObjectIdSchema,
} from "../../../shared/schemas/object.schema.js";

export const LocationNameSchema = z
  .string()
  .trim()
  .pipe(ObjectFieldsSchema.shape.name);
export const CreateLocationSchema = z
  .object({ name: LocationNameSchema })
  .strict();
export const UpdateLocationSchema = CreateLocationSchema;
export const IDLocationSchema = ObjectIdSchema;
export const UpdateLocationInputSchema = UpdateLocationSchema.extend({
  id: IDLocationSchema,
});

export type CreateLocationDTO = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationDTO = z.infer<typeof UpdateLocationSchema>;
export type IDLocationDTO = z.infer<typeof IDLocationSchema>;
