import { z } from "zod";
import { ALLOWED_OBJECT_TYPES } from "../entity/objects.entity.js";
import {
  ObjectNameSchema,
  UINT_MAX,
  nullableText,
  toBooleanLike,
} from "./objects-common.dto.js";

export const ObjectsSchema = z
  .object({
    name: ObjectNameSchema,
    objtype_id: z
      .number()
      .int()
      .positive()
      .max(UINT_MAX)
      .refine(
        (id) => ALLOWED_OBJECT_TYPES.includes(id),
        "Object type is not allowed.",
      ),
    label: nullableText(255).optional(),
    asset_no: nullableText(64).optional(),
    comment: nullableText(5000).optional(),
  })
  .strict();

const problemSchema = z
  .union([z.string(), z.boolean(), z.number()])
  .refine(
    (value) => toBooleanLike(value) !== null,
    "Invalid has_problems value.",
  )
  .transform((value): "yes" | "no" => (toBooleanLike(value) ? "yes" : "no"));

const attributeValueSchema = z.union([
  z.string().trim().min(1),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({ clear: z.literal(true) }).strict(),
]);

export const UpdateObjectAttributesSchema = z
  .object({
    name: ObjectNameSchema.optional(),
    label: nullableText(255).optional(),
    asset_no: nullableText(64).optional(),
    comment: nullableText(5000).optional(),
    has_problems: problemSchema.optional(),
  })
  .catchall(attributeValueSchema)
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0)
      ctx.addIssue({ code: "custom", message: "No fields provided." });
    for (const key of ["id", "object_id", "objtype_id", "Height, units"]) {
      if (Object.hasOwn(data, key))
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Field is immutable.",
        });
    }

    const fixed = ["name", "label", "asset_no", "comment", "has_problems"];

    for (const [key, value] of Object.entries(data)) {
      if (!fixed.includes(key) && value === null) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: 'Use {"clear":true} to clear an attribute.',
        });
      }
    }
  });

export type ObjectDTO = z.input<typeof ObjectsSchema>;
export type UpdateObjectAttributesDTO = z.input<
  typeof UpdateObjectAttributesSchema
>;
