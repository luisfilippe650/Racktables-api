import { ApplicationError } from "../../../shared/errors/application.error.js";

export class RowNotFoundError extends ApplicationError {
  constructor(rowId: number) {
    super("ROW_NOT_FOUND", 404, `Row ${rowId} was not found.`, { rowId });
  }
}

export class RowHasChildrenError extends ApplicationError {
  constructor(rowId: number) {
    super(
      "ROW_HAS_CHILDREN",
      409,
      `Row ${rowId} has linked entities and cannot be deleted.`,
      { rowId },
    );
  }
}

export class RowHasChildrenUnlinkError extends ApplicationError {
  constructor(rowId: number) {
    super(
      "ROW_HAS_CHILDREN",
      409,
      `Row ${rowId} cannot be unlinked while it has linked entities.`,
      { rowId },
    );
  }
}

export class LocationNotFoundError extends ApplicationError {
  constructor(locationId: number) {
    super("LOCATION_NOT_FOUND", 404, `Location ${locationId} was not found.`, {
      locationId,
    });
  }
}

export class RowNameConflictError extends ApplicationError {
  constructor(rowName: string) {
    super("ROW_NAME_CONFLICT", 409, `Row ${rowName} already exists.`, {
      rowName,
    });
  }
}

export class RowLocationConflictError extends ApplicationError {
  constructor(
    rowId: number,
    currentLocationId: number,
    requestedLocationId: number,
  ) {
    super(
      "ROW_LOCATION_CONFLICT",
      409,
      `Row ${rowId} is already linked to location ${currentLocationId}.`,
      { rowId, currentLocationId, requestedLocationId },
    );
  }
}

export class RowLocationLinkNotFoundError extends ApplicationError {
  constructor(rowId: number, locationId: number) {
    super(
      "ROW_LOCATION_LINK_NOT_FOUND",
      404,
      `Row ${rowId} is not linked to location ${locationId}.`,
      { rowId, locationId },
    );
  }
}

export { DatabaseOperationError } from "../../../shared/errors/database-operation.error.js";
