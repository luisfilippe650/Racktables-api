import { ObjectEntity } from "../../../shared/entity/object.entity.js";

export type RowInput = {
  name: string;
};

export type RowWithLocationInput = RowInput & {
  locationId: number;
};

export type RowUpdate = RowInput & {
  id: number;
};

export type RowOutput = ObjectEntity;

export type RowCreateResult =
  { status: "created"; row: RowOutput } | { status: "name_conflict" };

export type RowCreateWithLocationResult =
  | { status: "created"; row: RowOutput }
  | { status: "location_not_found" }
  | { status: "name_conflict" };

export type RowUpdateResult =
  | { status: "updated"; row: RowOutput }
  | { status: "not_found" }
  | { status: "name_conflict" };

export type RowDeleteResult =
  { status: "deleted" } | { status: "not_found" } | { status: "has_children" };

export type RowLinkToLocationResult =
  | { status: "linked" }
  | { status: "already_linked" }
  | { status: "row_not_found" }
  | { status: "location_not_found" }
  | { status: "location_conflict"; locationId: number };

export type RowUnlinkFromLocationResult =
  | { status: "unlinked" }
  | { status: "row_not_found" }
  | { status: "location_not_found" }
  | { status: "link_not_found" }
  | { status: "has_children" };
