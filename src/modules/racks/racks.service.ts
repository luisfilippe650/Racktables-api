import { z } from "zod";
import {
  RackActorSchema,
  RackIdSchema,
  RackListQuerySchema,
  RackNameSchema,
  RackObjectSpacesParamsSchema,
  RacksSchema,
  RackSpaceParamsSchema,
  UpdateRackSchema,
} from "./dto/racks.dto.js";
import type {
  RackDetailsOutput,
  RackInput,
  RackOccupancyData,
  RackOccupancyOutput,
  RackOutput,
  RackPage,
  RackPagination,
  RackSpaceAtom,
  RackSpaceOutput,
  RackUpdate,
} from "./entity/racks.entity.js";
import {
  InvalidRackInputError,
  RackAssetConflictError,
  RackHasChildrenError,
  RackHeightInvalidError,
  RackNameConflictError,
  RackSortOrderExhaustedError,
  RackNotFoundError,
  RowNotFoundError,
} from "./errors/racks.errors.js";
import { MAX_RACK_HEIGHT } from "./racks.constants.js";
import type { RacksRepository } from "./repository/racks.repository.js";

// Defines a schema that requires text and trims whitespace from the ends
function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new InvalidRackInputError(result.error.issues);
  }
  return result.data;
}

/** Any stored region makes the entire unit unavailable for a full-depth device. */
function calculateOccupancy(data: RackOccupancyData): RackOccupancyOutput {
  const height = data.height;

  if (
    height === null ||
    !Number.isSafeInteger(height) ||
    height <= 0 ||
    height > MAX_RACK_HEIGHT
  ) {
    throw new RackHeightInvalidError(data.rack_id, height);
  }
  const occupied = new Set<number>();

  const unavailable = new Set<number>();

  for (const space of data.spaces) {
    if (space.unit_no < 1 || space.unit_no > height) continue;

    unavailable.add(space.unit_no);

    if (space.object_id !== null) occupied.add(space.unit_no);
  }

  const free: number[] = [];

  for (let unit = 1; unit <= height; unit++) {
    if (!unavailable.has(unit)) free.push(unit);
  }
  return {
    rack_id: data.rack_id,
    rack_name: data.rack_name,
    total_units: height,
    occupied_units: [...occupied].sort((a, b) => a - b),
    unavailable_units: [...unavailable].sort((a, b) => a - b),
    free_units: free,
  };
}

export class RacksService {
  constructor(private readonly racksRepository: RacksRepository) {}

  async create(
    input: RackInput,
    actor: string | null = null,
  ): Promise<RackOutput> {
    const data = validate(RacksSchema, input);

    const result = await this.racksRepository.create(
      data,
      validate(RackActorSchema, actor),
    );

    switch (result.status) {
      case "row_not_found":
        throw new RowNotFoundError(data.row_id);
      case "name_conflict":
        throw new RackNameConflictError(data.name);
      case "asset_conflict":
        throw new RackAssetConflictError(data.asset_no!);
      case "sort_order_exhausted":
        throw new RackSortOrderExhaustedError(data.row_id);
      case "created":
        return result.rack;
    }
  }

  async update(
    id: number,
    input: Omit<RackUpdate, "id">,
    actor: string | null = null,
  ): Promise<RackOutput> {
    id = validate(RackIdSchema, id);

    const data = validate(UpdateRackSchema, input);

    const result = await this.racksRepository.update(
      { id, ...data },
      validate(RackActorSchema, actor),
    );

    switch (result.status) {
      case "not_found":
        throw new RackNotFoundError(id);
      case "name_conflict":
        throw new RackNameConflictError(data.name);
      case "updated":
        return result.rack;
    }
  }

  async delete(id: number): Promise<void> {
    id = validate(RackIdSchema, id);

    const result = await this.racksRepository.delete(id);

    if (result.status === "not_found") throw new RackNotFoundError(id);

    if (result.status === "has_children") throw new RackHasChildrenError(id);
  }

  async get(id: number): Promise<RackOutput> {
    id = validate(RackIdSchema, id);

    const rack = await this.racksRepository.get(id);

    if (rack === null) throw new RackNotFoundError(id);

    return rack;
  }

  async getByName(name: string): Promise<RackOutput | null> {
    return this.racksRepository.getByName(validate(RackNameSchema, name));
  }

  async getAll(
    query: Partial<RackPagination> = {},
  ): Promise<RackPage<RackOutput>> {
    return this.racksRepository.getAll(validate(RackListQuerySchema, query));
  }

  async getDetails(rackId: number): Promise<RackDetailsOutput> {
    rackId = validate(RackIdSchema, rackId);

    const details = await this.racksRepository.getDetails(rackId);

    if (details === null) throw new RackNotFoundError(rackId);

    return details;
  }

  async getOccupancy(rackId: number): Promise<RackOccupancyOutput> {
    rackId = validate(RackIdSchema, rackId);

    const data = await this.racksRepository.getOccupancy(rackId);
    if (data === null) throw new RackNotFoundError(rackId);
    return calculateOccupancy(data);
  }

  async getOccupancyAll(
    query: Partial<RackPagination> = {},
  ): Promise<RackPage<RackOccupancyOutput>> {
    const data = await this.racksRepository.getOccupancyAll(
      validate(RackListQuerySchema, query),
    );

    return { ...data, items: data.items.map(calculateOccupancy) };
  }

  async getSpaces(rackId: number): Promise<RackSpaceOutput[]> {
    rackId = validate(RackIdSchema, rackId);
    const spaces = await this.racksRepository.getSpaces(rackId);
    if (spaces === null) throw new RackNotFoundError(rackId);
    return spaces;
  }

  async getSpace(
    rackId: number,
    unitNo: number,
    atom: RackSpaceAtom,
  ): Promise<RackSpaceOutput | null> {
    const params = validate(RackSpaceParamsSchema, { rackId, unitNo, atom });

    const result = await this.racksRepository.getSpace(
      params.rackId,
      params.unitNo,
      params.atom,
    );

    if (result.status === "rack_not_found")
      throw new RackNotFoundError(params.rackId);
    return result.space;
  }

  async getObjectSpaces(
    rackId: number,
    objectId: number,
  ): Promise<RackSpaceOutput[]> {
    const params = validate(RackObjectSpacesParamsSchema, { rackId, objectId });

    const spaces = await this.racksRepository.getObjectSpaces(
      params.rackId,
      params.objectId,
    );

    if (spaces === null) throw new RackNotFoundError(params.rackId);
    return spaces;
  }
}
