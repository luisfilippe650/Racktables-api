import type { ObjectEntity } from "../../../shared/entity/object.entity.js";
import { OBJECT_TYPES } from "../../../shared/object-types.js";
import type { DictionaryOption } from "./objects-query.entity.js";
import type { ObjectMountDetails } from "./objects-placement.entity.js";

// Use this project's canonical IDs instead of the legacy Python aliases.
export const ALLOWED_OBJECT_TYPES: readonly number[] = [
  OBJECT_TYPES.BLACK_BOX,
  OBJECT_TYPES.SERVER,
  OBJECT_TYPES.ROUTER,
  OBJECT_TYPES.NETWORK_SWITCH,
  OBJECT_TYPES.NETWORK_SECURITY,
  OBJECT_TYPES.PATCH_PANEL,
  OBJECT_TYPES.PDU,
  OBJECT_TYPES.UPS,
];
export const MOUNTABLE_OBJECT_TYPES = ALLOWED_OBJECT_TYPES.filter(
  (id) => id !== OBJECT_TYPES.BLACK_BOX,
);
export const UPDATABLE_OBJECT_TYPES: readonly number[] = [
  OBJECT_TYPES.BLACK_BOX,
  OBJECT_TYPES.SERVER,
  OBJECT_TYPES.VM,
  OBJECT_TYPES.STORAGE,
];

export type ObjectInput = {
  name: string;
  objtype_id: number;
  label?: string | null;
  asset_no?: string | null;
  comment?: string | null;
};
export type ObjectOutput = ObjectEntity;
export type ObjectAttributeUpdateValue =
  string | number | boolean | null | { clear: true };
export type ObjectAttributeUpdates = Record<string, ObjectAttributeUpdateValue>;
export type ObjectUpdate = { id: number; updates: ObjectAttributeUpdates };
export type ObjectPortLink = {
  local_port_id: number;
  local_port_name: string;
  remote_port_id: number;
  remote_port_name: string;
  remote_object_id: number;
  remote_object_name: string | null;
  cable: string | null;
};
export type ObjectCreateResult =
  | { status: "created"; object: ObjectOutput; ports_created: number }
  | {
      status:
        | "invalid_type"
        | "type_not_allowed"
        | "name_conflict"
        | "asset_conflict";
    };
export type ObjectDeleteResult =
  | { status: "deleted"; object_id: number; objtype_id: number }
  | { status: "not_found" | "type_not_allowed" | "has_children" }
  | { status: "currently_mounted"; mounted_in: ObjectMountDetails[] }
  | { status: "physical_port_links"; links: ObjectPortLink[] };

export type ObjectLookupResult =
  | { status: "found"; object: ObjectOutput }
  | { status: "not_found" | "ambiguous" };

export type ObjectUpdateResult =
  | {
      status: "updated";
      object: ObjectOutput;
      fixed_fields_updated: string[];
      dynamic_attributes_updated: number;
    }
  | {
      status:
        "not_found" | "type_not_allowed" | "name_conflict" | "asset_conflict";
    }
  | {
      status: "invalid_attribute";
      field: string;
      message: string;
      available_options?: DictionaryOption[];
    };
