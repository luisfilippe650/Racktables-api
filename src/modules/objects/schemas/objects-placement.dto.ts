import { z } from "zod";
import { MAX_RACK_HEIGHT } from "../../racks/racks.constants.js";
import { UINT_MAX } from "./objects-common.dto.js";

const positiveInt = z.number().int().positive().max(UINT_MAX);

const rackUnit = positiveInt.max(MAX_RACK_HEIGHT);

export const MountObjectSchema = z
  .object({
    rack_id: positiveInt,
    object_id: positiveInt,
    start_unit: rackUnit,
    height: rackUnit,
  })
  .strict()
  .refine((data) => data.height <= data.start_unit, {
    path: ["height"],
    message: "Allocation crosses U1.",
  });

export const MoveObjectSchema = z
  .object({
    object_id: positiveInt,
    destination_rack_id: positiveInt,
    start_unit: rackUnit,
  })
  .strict();

export type MountObjectDTO = z.input<typeof MountObjectSchema>;
export type MoveObjectDTO = z.input<typeof MoveObjectSchema>;
