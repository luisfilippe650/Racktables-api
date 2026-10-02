export type ObjectAllocationStatus =
  "allocated" | "not_allocated" | "inconsistent_multiple_racks";
export type ObjectAllocation = {
  rack_id: number | null;
  rack_name: string | null;
  rack_count: number;
  allocation_status: ObjectAllocationStatus;
};

export type ObjectMountInput = {
  rack_id: number;
  object_id: number;
  start_unit: number;
  height: number;
};

export type ObjectMoveInput = {
  object_id: number;
  destination_rack_id: number;
  start_unit: number;
};

export type ObjectSpace = {
  rack_id: number;
  unit_no: number;
  atom: "front" | "interior" | "rear";
};

export type ObjectMountOutput = ObjectMountInput & {
  end_unit: number;
  molecule_id: number;
};

export type ObjectUnmountOutput = {
  object_id: number;
  rack_id: number;
  units_removed: number[];
  molecule_id: number;
};

export type ObjectMoveOutput = ObjectMoveInput & {
  source_rack_id: number;
  end_unit: number;
  height: number;
  old_molecule_id: number;
  new_molecule_id: number;
};

export type ObjectMountDetails = {
  rack_id: number;
  rack_name: string | null;
  start_unit: number;
  end_unit: number;
  height: number;
};

export type ObjectPlacementFailure =
  | {
      status:
        | "object_not_found"
        | "rack_not_found"
        | "type_not_allowed"
        | "already_mounted"
        | "not_mounted"
        | "inconsistent_allocation"
        | "rack_height_missing"
        | "rack_height_invalid"
        | "out_of_bounds";
    }
  | {
      status: "space_occupied";
      position: ObjectSpace;
      object_id: number | null;
    };
export type ObjectMountResult =
  { status: "mounted"; allocation: ObjectMountOutput } | ObjectPlacementFailure;

export type ObjectUnmountResult =
  | { status: "unmounted"; allocation: ObjectUnmountOutput }
  | ObjectPlacementFailure;

export type ObjectMoveResult =
  { status: "moved"; allocation: ObjectMoveOutput } | ObjectPlacementFailure;
