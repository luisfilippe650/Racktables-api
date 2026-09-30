import { ApplicationError } from "../../../shared/errors/application.error.js";

export class LocationNotFoundError extends ApplicationError {
  constructor(locationId: number) {
    super("LOCATION_NOT_FOUND", 404, `Location ${locationId} was not found.`, {
      locationId,
    });
  }
}

export class LocationHasRowsError extends ApplicationError {
  constructor(locationId: number) {
    super(
      "LOCATION_HAS_ROWS",
      409,
      `Location ${locationId} has linked rows and cannot be deleted.`,
      { locationId },
    );
  }
}
