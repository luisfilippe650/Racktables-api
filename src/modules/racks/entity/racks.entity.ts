import type { ObjectEntity } from "../../../shared/entity/object.entity.js";

export type RackInput = {
  name: string;
  row_id: number;
  rack_height?: number;
  asset_no?: string | null;
};

export type RackUpdate = {
  id: number;
  name: string;
};

export type RackOutput = ObjectEntity;

export type RackDetailsOutput = RackOutput & {
  height: number | null;
  sort_order: number | null;
  row_id: number | null;
  row_name: string | null;
  location_id: number | null;
  location_name: string | null;
};

export type RackSpaceAtom = "front" | "interior" | "rear";

export type RackSpaceOutput = {
  rack_id: number;
  unit_no: number;
  atom: RackSpaceAtom;
  state: "A" | "U" | "T";
  object_id: number | null;
  object_name: string | null;
};

export type RackOccupancyOutput = {
  rack_id: number;
  rack_name: string | null;
  total_units: number;
  /* Units with at least one assigned object. */
  occupied_units: number[];
  /* Units with any stored position (equipment, absent or unusable region). */
  unavailable_units: number[];
  free_units: number[];
};

export type RackCreateResult =
  | { status: "created"; rack: RackOutput }
  | { status: "row_not_found" }
  | { status: "name_conflict" }
  | { status: "asset_conflict" }
  | { status: "sort_order_exhausted" };

export type RackUpdateResult =
  | { status: "updated"; rack: RackOutput }
  | { status: "not_found" }
  | { status: "name_conflict" };

export type RackDeleteResult =
  { status: "deleted" } | { status: "not_found" } | { status: "has_children" };

/* Persistence data, the service calculates unit availability. */
export type RackOccupancyData = {
  rack_id: number;
  rack_name: string | null;
  height: number | null;
  spaces: Pick<RackSpaceOutput, "unit_no" | "state" | "object_id">[];
};

export type RackPagination = { page: number; per_page: number };

export type RackPage<T> = RackPagination & { items: T[]; total: number };

export type RackSpaceResult =
  | { status: "rack_not_found" }
  | { status: "found"; space: RackSpaceOutput | null };
