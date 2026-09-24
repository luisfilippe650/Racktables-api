import { Prisma } from "../../../database/prisma.js";
import {
  LocationInput,
  LocationUpdateInput,
  LocationOutput,
} from "../entity/locations.entity.js";
import { LocationsRepository } from "./locations.repository.js";
import { OBJECT_TYPES } from "../../../shared/object-types.js";

export class LocationPrismaRepository extends LocationsRepository {
  constructor(private readonly prisma: typeof Prisma = Prisma) {
    super();
  }

  async create(data: LocationInput): Promise<LocationOutput | null> {
    try {
      return await this.prisma.object.create({
        data: {
          name: data.name,
          objtype_id: OBJECT_TYPES.LOCATION,
        },
      });
    } catch (error) {
      return null;
    }
  }

  async delete(id: number): Promise<void | null> {
    try {
      await this.prisma.object.delete({
        where: { id, objtype_id: OBJECT_TYPES.LOCATION },
      });
    } catch (error) {
      return null;
    }
  }

  async updateLocation(
    data: LocationUpdateInput,
  ): Promise<LocationOutput | null> {
    try {
      return await this.prisma.object.update({
        where: { id: data.id, objtype_id: OBJECT_TYPES.LOCATION },
        data: {
          name: data.name,
        },
      });
    } catch (error) {
      return null;
    }
  }

  async getAllLocations(): Promise<LocationOutput[] | null> {
    try {
      return await this.prisma.object.findMany({
        where: { objtype_id: OBJECT_TYPES.LOCATION },
      });
    } catch (error) {
      return null;
    }
  }

  async getLocation(id: number): Promise<LocationOutput | null> {
    try {
      return await this.prisma.object.findFirst({
        where: { id, objtype_id: OBJECT_TYPES.LOCATION },
      });
    } catch (error) {
      return null;
    }
  }
}
