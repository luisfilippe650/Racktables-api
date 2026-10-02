import { ApplicationError } from "../../../shared/errors/application.error.js";
import type { ObjectPortLink } from "../entity/objects.entity.js";
import type { DictionaryOption } from "../entity/objects-query.entity.js";
import type {
  ObjectMountDetails,
  ObjectSpace,
} from "../entity/objects-placement.entity.js";

export { DatabaseOperationError } from "../../../shared/errors/database-operation.error.js";

export class ObjectNotFoundError extends ApplicationError {
  constructor(objectId: number) {
    super("OBJECT_NOT_FOUND", 404, `Object ${objectId} was not found.`, {
      objectId,
    });
  }
}

export class InvalidObjectInputError extends ApplicationError {
  constructor(issues: unknown) {
    super("INVALID_OBJECT_INPUT", 400, "Invalid object input.", { issues });
  }
}

export class ObjectTypeInvalidError extends ApplicationError {
  constructor(objectTypeId: number) {
    super(
      "OBJECT_TYPE_INVALID",
      400,
      `Object type ${objectTypeId} does not exist.`,
      { objectTypeId },
    );
  }
}

export class ObjectTypeNotAllowedError extends ApplicationError {
  constructor(objectTypeId?: number, objectId?: number) {
    super(
      "OBJECT_TYPE_NOT_ALLOWED",
      403,
      "This object type is not allowed for this operation.",
      {
        ...(objectTypeId !== undefined ? { objectTypeId } : {}),
        ...(objectId !== undefined ? { objectId } : {}),
      },
    );
  }
}

export class ObjectNameConflictError extends ApplicationError {
  constructor(objectName: string) {
    super("OBJECT_NAME_CONFLICT", 409, `Object ${objectName} already exists.`, {
      objectName,
    });
  }
}

export class ObjectAssetConflictError extends ApplicationError {
  constructor(assetNo: string) {
    super(
      "OBJECT_ASSET_CONFLICT",
      409,
      `Asset number ${assetNo} is already in use.`,
      { assetNo },
    );
  }
}

export class ObjectLookupAmbiguousError extends ApplicationError {
  constructor(field: "name" | "service_tag", value: string) {
    super(
      "OBJECT_LOOKUP_AMBIGUOUS",
      409,
      "Multiple objects match this lookup.",
      { field, value },
    );
  }
}

export class ObjectLookupNotFoundError extends ApplicationError {
  constructor(field: "name" | "service_tag", value: string) {
    super("OBJECT_NOT_FOUND", 404, "No object matches this lookup.", {
      field,
      value,
    });
  }
}

export class ObjectHasChildrenError extends ApplicationError {
  constructor(objectId: number) {
    super(
      "OBJECT_HAS_CHILDREN",
      409,
      "Object has linked children and cannot be deleted.",
      { objectId },
    );
  }
}

export class ObjectCurrentlyMountedError extends ApplicationError {
  constructor(objectId: number, mountedIn: ObjectMountDetails[]) {
    super(
      "OBJECT_CURRENTLY_MOUNTED",
      409,
      "Unmount the object before deleting it.",
      { objectId, mountedIn },
    );
  }
}

export class ObjectPhysicalPortLinksError extends ApplicationError {
  constructor(objectId: number, links: ObjectPortLink[]) {
    super(
      "OBJECT_PHYSICAL_PORT_LINKS",
      409,
      "Disconnect the physical port links before deleting this object.",
      { objectId, links },
    );
  }
}

export class InvalidObjectAttributeError extends ApplicationError {
  constructor(
    field: string,
    message: string,
    availableOptions?: DictionaryOption[],
  ) {
    super("INVALID_OBJECT_ATTRIBUTE", 400, message, {
      field,
      ...(availableOptions ? { availableOptions } : {}),
    });
  }
}

export class DictionaryChapterNotFoundError extends ApplicationError {
  constructor(chapterId: number) {
    super(
      "DICTIONARY_CHAPTER_NOT_FOUND",
      404,
      "Dictionary chapter has no options.",
      { chapterId },
    );
  }
}

export class RackNotFoundError extends ApplicationError {
  constructor(rackId?: number) {
    super(
      "RACK_NOT_FOUND",
      404,
      rackId === undefined
        ? "Rack was not found."
        : `Rack ${rackId} was not found.`,
      rackId === undefined ? undefined : { rackId },
    );
  }
}

export class RackHeightInvalidError extends ApplicationError {
  constructor(rackId?: number) {
    super(
      "RACK_HEIGHT_INVALID",
      409,
      "Rack has no valid height attribute.",
      rackId === undefined ? undefined : { rackId },
    );
  }
}

export class ObjectSpaceOccupiedError extends ApplicationError {
  constructor(position: ObjectSpace, occupyingObjectId: number | null) {
    super(
      "OBJECT_SPACE_OCCUPIED",
      409,
      "The target rack position is unavailable.",
      { position, occupyingObjectId },
    );
  }
}

export class ObjectAlreadyMountedError extends ApplicationError {
  constructor(objectId: number) {
    super(
      "OBJECT_ALREADY_MOUNTED",
      409,
      "Object is already allocated in a rack.",
      { objectId },
    );
  }
}

export class ObjectNotMountedError extends ApplicationError {
  constructor(objectId: number) {
    super("OBJECT_NOT_MOUNTED", 409, "Object is not allocated in a rack.", {
      objectId,
    });
  }
}

export class ObjectAllocationInconsistentError extends ApplicationError {
  constructor(objectId: number) {
    super(
      "OBJECT_ALLOCATION_INCONSISTENT",
      409,
      "Allocation must occupy contiguous units and all three atoms in one rack.",
      { objectId },
    );
  }
}

export class ObjectAllocationOutOfBoundsError extends ApplicationError {
  constructor(rackId?: number, startUnit?: number, height?: number) {
    super(
      "OBJECT_ALLOCATION_OUT_OF_BOUNDS",
      400,
      "Allocation exceeds the rack boundaries.",
      {
        ...(rackId !== undefined ? { rackId } : {}),
        ...(startUnit !== undefined ? { startUnit } : {}),
        ...(height !== undefined ? { height } : {}),
      },
    );
  }
}
