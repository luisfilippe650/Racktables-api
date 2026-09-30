import { Prisma } from "../../../database/prisma.js";
import {
  LocationInput,
  LocationUpdateInput,
  LocationOutput,
  LocationDeleteResult,
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

  async delete(id: number): Promise<LocationDeleteResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const location = await tx.object.findFirst({
          where: { id, objtype_id: OBJECT_TYPES.LOCATION },
          select: { id: true },
        });

        if (!location) {
          return { status: "not_found" };
        }

        const linkedRow = await tx.entityLink.findFirst({
          where: {
            parent_entity_type: "location",
            parent_entity_id: id,
            child_entity_type: "row",
          },
          select: { id: true },
        });

        if (linkedRow) {
          return { status: "has_rows" };
        }

        await tx.object.delete({
          where: { id, objtype_id: OBJECT_TYPES.LOCATION },
        });

        return { status: "deleted" };
      },
      { isolationLevel: "Serializable" },
    );
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
