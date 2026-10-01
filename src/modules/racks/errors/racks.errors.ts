import { ApplicationError } from "../../../shared/errors/application.error.js";

export class DatabaseOperationError extends ApplicationError {
  constructor(cause: unknown) {
    super(
      "DATABASE_ERROR",
      500,
      "It was not possible to complete the database operation.",
      undefined,
      { cause },
    );
  }
}

export class RackNotFoundError extends ApplicationError {
  constructor(rackId: number) {
    super("RACK_NOT_FOUND", 404, `Rack ${rackId} was not found.`, { rackId });
  }
}

export class RowNotFoundError extends ApplicationError {
  constructor(rowId: number) {
    super("ROW_NOT_FOUND", 404, `Row ${rowId} was not found.`, { rowId });
  }
}

export class RackNameConflictError extends ApplicationError {
  constructor(rackName: string) {
    super("RACK_NAME_CONFLICT", 409, `Rack ${rackName} already exists.`, {
      rackName,
    });
  }
}

export class RackHasChildrenError extends ApplicationError {
  constructor(rackId: number) {
    super(
      "RACK_HAS_CHILDREN",
      409,
      `Rack ${rackId} has linked or allocated objects and cannot be deleted.`,
      { rackId },
    );
  }
}

export class RackAssetConflictError extends ApplicationError {
  constructor(assetNo: string) {
    super(
      "RACK_ASSET_CONFLICT",
      409,
      `Asset number ${assetNo} is already in use.`,
      { assetNo },
    );
  }
}

export class InvalidRackInputError extends ApplicationError {
  constructor(issues: unknown) {
    super("INVALID_RACK_INPUT", 400, "Invalid rack input.", { issues });
  }
}

export class RackHeightInvalidError extends ApplicationError {
  constructor(rackId: number, height: number | null) {
    super(
      "RACK_HEIGHT_INVALID",
      409,
      `Rack ${rackId} has no valid height attribute.`,
      { rackId, height },
    );
  }
}

export class RackSortOrderExhaustedError extends ApplicationError {
  constructor(rowId: number) {
    super(
      "RACK_SORT_ORDER_EXHAUSTED",
      409,
      "Rack sort order has reached its maximum value for this row.",
      { rowId },
    );
  }
}
