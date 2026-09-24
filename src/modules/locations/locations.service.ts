import { LocationsRepository } from "./repository/locations.repository.js";
import { CreateLocationDTO, IDLocationDTO } from "./dto/locations.dto.js";

import {
  LocationOutput,
  LocationUpdateInput,
} from "./entity/locations.entity.js";

export class LocationsService {
  constructor(private readonly locationRepository: LocationsRepository) {}

  async create(data: CreateLocationDTO): Promise<LocationOutput | null> {
    const location = await this.locationRepository.create(data);

    if (location == null) {
      throw new Error("It was not possible to create the location.");
    }

    return location;
  }

  async delete(id: IDLocationDTO): Promise<void> {
    const location = await this.locationRepository.delete(id);

    if (location == null) {
      throw new Error("It was not possible to delete the location.");
    }

    return location;
  }

  async updateLocation(data: LocationUpdateInput): Promise<LocationOutput> {
    const location = await this.locationRepository.updateLocation(data);

    if (location == null) {
      throw new Error("It was not possible to update the location.");
    }

    return location;
  }

  async getlocation(id: IDLocationDTO): Promise<LocationOutput> {
    const location = await this.locationRepository.getLocation(id);

    if (location == null) {
      throw new Error("It was not possible to found the location.");
    }

    return location;
  }

  async getAllLocations(): Promise<LocationOutput[]> {
    const locations = await this.getAllLocations();

    if (locations == null) {
      throw new Error("It was not possible to found the locations.");
    }

    return locations;
  }
}
