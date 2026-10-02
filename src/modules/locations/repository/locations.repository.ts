import type {
  LocationCreateResult,
  LocationDeleteResult,
  LocationInput,
  LocationOutput,
  LocationUpdateInput,
  LocationUpdateResult,
} from "../entity/locations.entity.js";

export abstract class LocationsRepository {
  abstract create(data: LocationInput): Promise<LocationCreateResult>;
  abstract update(data: LocationUpdateInput): Promise<LocationUpdateResult>;
  abstract delete(id: number): Promise<LocationDeleteResult>;
  abstract get(id: number): Promise<LocationOutput | null>;
  abstract getAll(): Promise<LocationOutput[]>;
}
