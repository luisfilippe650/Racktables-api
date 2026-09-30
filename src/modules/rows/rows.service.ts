import {
  RowDTO,
  RowNameDTO,
  RowWithLocationDTO,
  UpdateRowDTO,
} from "./dto/rows.dto.js";
import { RowOutput } from "./entity/rows.entity.js";
import {
  LocationNotFoundError,
  RowHasChildrenError,
  RowHasChildrenUnlinkError,
  RowLocationConflictError,
  RowLocationLinkNotFoundError,
  RowNameConflictError,
  RowNotFoundError,
} from "./errors/rows.errors.js";
import { RowRepository } from "./repository/rows.repository.js";

export class RowService {
  constructor(private readonly rowRepository: RowRepository) {}

  async create(data: RowDTO): Promise<RowOutput> {
    const result = await this.rowRepository.create(data);

    if (result.status === "name_conflict") {
      throw new RowNameConflictError(data.name);
    }

    return result.row;
  }

  async createWithLocation(data: RowWithLocationDTO): Promise<RowOutput> {
    const result = await this.rowRepository.createWithLocation(data);

    if (result.status === "location_not_found") {
      throw new LocationNotFoundError(data.locationId);
    }

    if (result.status === "name_conflict") {
      throw new RowNameConflictError(data.name);
    }

    return result.row;
  }

  async delete(id: number): Promise<void> {
    const result = await this.rowRepository.delete(id);

    if (result.status === "not_found") {
      throw new RowNotFoundError(id);
    }

    if (result.status === "has_children") {
      throw new RowHasChildrenError(id);
    }
  }

  async update(id: number, data: UpdateRowDTO): Promise<RowOutput> {
    const result = await this.rowRepository.update({
      id,
      name: data.name,
    });

    if (result.status === "not_found") {
      throw new RowNotFoundError(id);
    }

    if (result.status === "name_conflict") {
      throw new RowNameConflictError(data.name);
    }

    return result.row;
  }

  async linkToLocation(rowId: number, locationId: number): Promise<void> {
    const result = await this.rowRepository.linkToLocation(rowId, locationId);

    switch (result.status) {
      case "linked":
      case "already_linked":
        return;
      case "row_not_found":
        throw new RowNotFoundError(rowId);
      case "location_not_found":
        throw new LocationNotFoundError(locationId);
      case "location_conflict":
        throw new RowLocationConflictError(
          rowId,
          result.locationId,
          locationId,
        );
    }
  }

  async unlinkFromLocation(rowId: number, locationId: number): Promise<void> {
    const result = await this.rowRepository.unlinkFromLocation(
      rowId,
      locationId,
    );

    switch (result.status) {
      case "unlinked":
        return;
      case "row_not_found":
        throw new RowNotFoundError(rowId);
      case "location_not_found":
        throw new LocationNotFoundError(locationId);
      case "link_not_found":
        throw new RowLocationLinkNotFoundError(rowId, locationId);
      case "has_children":
        throw new RowHasChildrenUnlinkError(rowId);
    }
  }

  async get(id: number): Promise<RowOutput> {
    const row = await this.rowRepository.get(id);

    if (row === null) {
      throw new RowNotFoundError(id);
    }

    return row;
  }

  async getByName(name: RowNameDTO): Promise<RowOutput | null> {
    return this.rowRepository.getByName(name);
  }

  async getAll(): Promise<RowOutput[]> {
    return this.rowRepository.getAll();
  }
}
