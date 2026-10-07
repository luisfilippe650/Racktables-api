import { z } from "zod";
import { ObjectFieldsSchema } from "../../../shared/schemas/object.schema.js";
import { DEFAULT_RACK_HEIGHT, MAX_RACK_HEIGHT } from "../racks.constants.js";

//setting the maximum height value
const UINT_MAX = 4_294_967_295;
export const RackIdSchema = z.coerce.number().int().positive().max(UINT_MAX);

export const RackActorSchema = z.string().trim().min(1).max(64).nullable();

export const RackNameSchema = z
  .string()
  .trim()
  .pipe(ObjectFieldsSchema.shape.name);

export const RacksSchema = z
  .object({
    name: RackNameSchema,
    row_id: z.number().int().positive().max(UINT_MAX),
    rack_height: z
      .number()
      .int()
      .positive()
      .max(MAX_RACK_HEIGHT)
      .default(DEFAULT_RACK_HEIGHT),
    asset_no: z
      .string()
      .trim()
      .max(64)
      .transform((value) => value || null)
      .nullable()
      .optional(),
  })
  .strict();

export const UpdateRackSchema = z.object({ name: RackNameSchema }).strict();

export const UpdateRackInputSchema = UpdateRackSchema.extend({
  id: RackIdSchema,
});

export const RackIdParamsSchema = z.object({ id: RackIdSchema }).strict();

export const RackNameQuerySchema = z.object({ name: RackNameSchema }).strict();

export const RackSpaceAtomSchema = z.enum(["front", "interior", "rear"]);

export const RackSpaceParamsSchema = z
  .object({
    rackId: RackIdSchema,
    unitNo: RackIdSchema,
    atom: RackSpaceAtomSchema,
  })
  .strict();

export const RackObjectSpacesParamsSchema = z
  .object({
    rackId: RackIdSchema,
    objectId: RackIdSchema,
  })
  .strict();

export const RackListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().max(2_147_483_647).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()
  .refine((value) => (value.page - 1) * value.per_page <= 2_147_483_647, {
    message: "Pagination offset exceeds the supported limit.",
    path: ["page"],
  });

export type RackDTO = z.infer<typeof RacksSchema>;
export type UpdateRackDTO = z.infer<typeof UpdateRackSchema>;
export type RackListQueryDTO = z.infer<typeof RackListQuerySchema>;
export type RackSpaceParamsDTO = z.infer<typeof RackSpaceParamsSchema>;
