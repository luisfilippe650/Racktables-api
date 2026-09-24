import type { ObjectEntity } from "../../../shared/entity/object.entity.js";

export type LocationInput = {
  name: string;
};

export type LocationUpdateInput = LocationInput & {
  id: number;
};

export type LocationOutput = ObjectEntity ;
