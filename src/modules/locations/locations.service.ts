import { validate } from "../../shared/validation/validate.js";
import type { LocationsRepository } from "./repository/locations.repository.js";
import {
  CreateLocationSchema,
  IDLocationSchema,
  UpdateLocationSchema,
  type CreateLocationDTO,
  type IDLocationDTO,
  type UpdateLocationDTO,
} from "./schemas/locations.dto.js";
import type { LocationOutput } from "./entity/locations.entity.js";
import {
  LocationHasRowsError,
  LocationNotFoundError,
  LocationNameConflictError,
} from "./errors/locations.errors.js";

export class LocationsService {
  constructor(private readonly locationRepository: LocationsRepository) {}

  async create(input: CreateLocationDTO): Promise<LocationOutput> {
    const data = validate(CreateLocationSchema, input);
    const result = await this.locationRepository.create(data);
    if (result.status === "name_conflict")
      throw new LocationNameConflictError(data.name);
    return result.location;
  }

  async update(
    id: IDLocationDTO,
    input: UpdateLocationDTO,
  ): Promise<LocationOutput> {
    id = validate(IDLocationSchema, id);
    const data = validate(UpdateLocationSchema, input);
    const result = await this.locationRepository.update({ id, ...data });
    switch (result.status) {
      case "updated":
        return result.location;
      case "not_found":
        throw new LocationNotFoundError(id);
      case "name_conflict":
        throw new LocationNameConflictError(data.name);
    }
  }

  async delete(id: IDLocationDTO): Promise<void> {
    id = validate(IDLocationSchema, id);
    const result = await this.locationRepository.delete(id);
    if (result.status === "not_found") throw new LocationNotFoundError(id);
    if (result.status === "has_rows") throw new LocationHasRowsError(id);
  }

  async get(id: IDLocationDTO): Promise<LocationOutput> {
    id = validate(IDLocationSchema, id);
    const location = await this.locationRepository.get(id);
    if (location === null) throw new LocationNotFoundError(id);
    return location;
  }

  async getAll(): Promise<LocationOutput[]> {
    return this.locationRepository.getAll();
  }
}
