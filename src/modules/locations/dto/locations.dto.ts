import { z } from "zod";
import {
  ObjectFieldsSchema,
  ObjectIdParamsSchema,
} from "../../../shared/schemas/object.schema.js";

export const CreateLocationSchema = z.object({
  id: ObjectIdParamsSchema.shape.id,
  name: ObjectFieldsSchema.shape.name,
});

export const UpdateLocationSchema = z
  .object({
    name: ObjectFieldsSchema.shape.name,
  })
  .strict();

export const IDLocationSchema = ObjectIdParamsSchema.shape.id;



export type CreateLocationDTO = z.infer<typeof CreateLocationSchema>;

export type UpdateLocationDTO = z.infer<typeof UpdateLocationSchema>;

export type IDLocationDTO = z.infer<typeof IDLocationSchema>;
