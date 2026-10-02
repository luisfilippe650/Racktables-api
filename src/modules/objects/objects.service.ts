import { validate } from "../../shared/validation/validate.js";
import {
  ObjectActorSchema,
  type ObjectActorDTO,
  type ObjectIdDTO,
  type ObjectNameDTO,
  ObjectIdSchema,
  ObjectNameSchema,
} from "./dto/objects-common.dto.js";
import {
  ObjectAllQuerySchema,
  type ObjectAllQueryDTO,
  type ObjectListQueryDTO,
  type ObjectServiceTagQueryDTO,
  type ObjectSummaryQueryDTO,
  ObjectListQuerySchema,
  ObjectServiceTagQuerySchema,
  ObjectSummaryQuerySchema,
} from "./dto/objects-query.dto.js";
import {
  MountObjectSchema,
  type MountObjectDTO,
  type MoveObjectDTO,
  MoveObjectSchema,
} from "./dto/objects-placement.dto.js";
import {
  ObjectsSchema,
  type ObjectDTO,
  type UpdateObjectAttributesDTO,
  UpdateObjectAttributesSchema,
} from "./dto/objects.dto.js";
import type {
  ObjectCreateResult,
  ObjectLookupResult,
  ObjectOutput,
  ObjectUpdateResult,
} from "./entity/objects.entity.js";
import type {
  DictionaryOption,
  ObjectAllOutput,
  ObjectListOutput,
  ObjectPage,
  ObjectSummaryOutput,
  ObjectTypeOutput,
} from "./entity/objects-query.entity.js";
import type {
  ObjectMountOutput,
  ObjectMoveOutput,
  ObjectPlacementFailure,
  ObjectUnmountOutput,
} from "./entity/objects-placement.entity.js";
import {
  DictionaryChapterNotFoundError,
  InvalidObjectAttributeError,
  InvalidObjectInputError,
  ObjectAllocationInconsistentError,
  ObjectAllocationOutOfBoundsError,
  ObjectAlreadyMountedError,
  ObjectAssetConflictError,
  ObjectCurrentlyMountedError,
  ObjectHasChildrenError,
  ObjectLookupAmbiguousError,
  ObjectLookupNotFoundError,
  ObjectNameConflictError,
  ObjectNotFoundError,
  ObjectNotMountedError,
  ObjectPhysicalPortLinksError,
  ObjectSpaceOccupiedError,
  ObjectTypeInvalidError,
  ObjectTypeNotAllowedError,
  RackHeightInvalidError,
  RackNotFoundError,
} from "./errors/objects.errors.js";
import type { ObjectsRepository } from "./repository/objects.repository.js";

export type ObjectCreateOutput = Omit<
  Extract<ObjectCreateResult, { status: "created" }>,
  "status"
>;
export type ObjectUpdateOutput = Omit<
  Extract<ObjectUpdateResult, { status: "updated" }>,
  "status"
>;

function lookup(
  result: ObjectLookupResult,
  field: "name" | "service_tag",
  value: string,
): ObjectOutput {
  switch (result.status) {
    case "found":
      return result.object;
    case "not_found":
      throw new ObjectLookupNotFoundError(field, value);
    case "ambiguous":
      throw new ObjectLookupAmbiguousError(field, value);
  }
}

function placementFailure(
  failure: ObjectPlacementFailure,
  context: {
    objectId: number;
    rackId?: number;
    startUnit?: number;
    height?: number;
  },
): never {
  switch (failure.status) {
    case "object_not_found":
      throw new ObjectNotFoundError(context.objectId);
    case "rack_not_found":
      throw new RackNotFoundError(context.rackId);
    case "type_not_allowed":
      throw new ObjectTypeNotAllowedError(undefined, context.objectId);
    case "already_mounted":
      throw new ObjectAlreadyMountedError(context.objectId);
    case "not_mounted":
      throw new ObjectNotMountedError(context.objectId);
    case "inconsistent_allocation":
      throw new ObjectAllocationInconsistentError(context.objectId);
    case "rack_height_missing":
    case "rack_height_invalid":
      throw new RackHeightInvalidError(context.rackId);
    case "out_of_bounds":
      throw new ObjectAllocationOutOfBoundsError(
        context.rackId,
        context.startUnit,
        context.height,
      );
    case "space_occupied":
      throw new ObjectSpaceOccupiedError(failure.position, failure.object_id);
  }
}

export class ObjectsService {
  constructor(private readonly objectsRepository: ObjectsRepository) {}

  async create(
    input: ObjectDTO,
    actor: ObjectActorDTO = null,
  ): Promise<ObjectCreateOutput> {
    const data = validate(ObjectsSchema, input, InvalidObjectInputError);

    const result = await this.objectsRepository.create(
      data,
      validate(ObjectActorSchema, actor, InvalidObjectInputError),
    );

    switch (result.status) {
      case "created":
        return { object: result.object, ports_created: result.ports_created };
      case "invalid_type":
        throw new ObjectTypeInvalidError(data.objtype_id);
      case "type_not_allowed":
        throw new ObjectTypeNotAllowedError(data.objtype_id);
      case "name_conflict":
        throw new ObjectNameConflictError(data.name);
      case "asset_conflict":
        throw new ObjectAssetConflictError(data.asset_no!);
    }
  }

  async update(
    id: ObjectIdDTO,
    input: UpdateObjectAttributesDTO,
    actor: ObjectActorDTO = null,
  ): Promise<ObjectUpdateOutput> {
    id = validate(ObjectIdSchema, id, InvalidObjectInputError);

    const updates = validate(
      UpdateObjectAttributesSchema,
      input,
      InvalidObjectInputError,
    );

    const result = await this.objectsRepository.update(
      { id, updates },
      validate(ObjectActorSchema, actor, InvalidObjectInputError),
    );

    switch (result.status) {
      case "updated":
        return {
          object: result.object,
          fixed_fields_updated: result.fixed_fields_updated,
          dynamic_attributes_updated: result.dynamic_attributes_updated,
        };
      case "not_found":
        throw new ObjectNotFoundError(id);
      case "type_not_allowed":
        throw new ObjectTypeNotAllowedError(undefined, id);
      case "name_conflict":
        throw new ObjectNameConflictError(updates.name!);
      case "asset_conflict":
        throw new ObjectAssetConflictError(updates.asset_no!);
      case "invalid_attribute":
        throw new InvalidObjectAttributeError(
          result.field,
          result.message,
          result.available_options,
        );
    }
  }

  async delete(id: ObjectIdDTO, actor: ObjectActorDTO = null): Promise<void> {
    id = validate(ObjectIdSchema, id, InvalidObjectInputError);
    const result = await this.objectsRepository.delete(
      id,
      validate(ObjectActorSchema, actor, InvalidObjectInputError),
    );
    switch (result.status) {
      case "deleted":
        return;
      case "not_found":
        throw new ObjectNotFoundError(id);
      case "type_not_allowed":
        throw new ObjectTypeNotAllowedError(undefined, id);
      case "has_children":
        throw new ObjectHasChildrenError(id);
      case "currently_mounted":
        throw new ObjectCurrentlyMountedError(id, result.mounted_in);
      case "physical_port_links":
        throw new ObjectPhysicalPortLinksError(id, result.links);
    }
  }

  async get(id: ObjectIdDTO): Promise<ObjectOutput> {
    id = validate(ObjectIdSchema, id, InvalidObjectInputError);
    const object = await this.objectsRepository.get(id);
    if (object === null) throw new ObjectNotFoundError(id);
    return object;
  }

  async getByName(name: ObjectNameDTO): Promise<ObjectOutput> {
    name = validate(ObjectNameSchema, name, InvalidObjectInputError);
    return lookup(await this.objectsRepository.getByName(name), "name", name);
  }

  async getByServiceTag(
    serviceTag: ObjectServiceTagQueryDTO["service_tag"],
  ): Promise<ObjectOutput> {
    const { service_tag } = validate(
      ObjectServiceTagQuerySchema,
      {
        service_tag: serviceTag,
      },
      InvalidObjectInputError,
    );
    return lookup(
      await this.objectsRepository.getByServiceTag(service_tag),
      "service_tag",
      service_tag,
    );
  }

  async getAll(
    query: ObjectListQueryDTO = {},
  ): Promise<ObjectPage<ObjectListOutput>> {
    return this.objectsRepository.getAll(
      validate(ObjectListQuerySchema, query, InvalidObjectInputError),
    );
  }

  async getAllObjects(
    query: ObjectAllQueryDTO = {},
  ): Promise<ObjectPage<ObjectAllOutput>> {
    return this.objectsRepository.getAllObjects(
      validate(ObjectAllQuerySchema, query, InvalidObjectInputError),
    );
  }

  async getTypes(
    query: ObjectListQueryDTO = {},
  ): Promise<ObjectPage<ObjectTypeOutput>> {
    return this.objectsRepository.getTypes(
      validate(ObjectListQuerySchema, query, InvalidObjectInputError),
    );
  }

  async getSummary(
    id: ObjectIdDTO,
    includeOptions: ObjectSummaryQueryDTO["include_options"] = false,
  ): Promise<ObjectSummaryOutput> {
    id = validate(ObjectIdSchema, id, InvalidObjectInputError);
    const { include_options } = validate(
      ObjectSummaryQuerySchema,
      {
        include_options: includeOptions,
      },
      InvalidObjectInputError,
    );
    const summary = await this.objectsRepository.getSummary(
      id,
      include_options,
    );
    if (summary === null) throw new ObjectNotFoundError(id);
    return summary;
  }

  async getDictionaryOptions(
    chapterId: ObjectIdDTO,
    query: ObjectListQueryDTO = {},
  ): Promise<ObjectPage<DictionaryOption>> {
    chapterId = validate(ObjectIdSchema, chapterId, InvalidObjectInputError);
    const options = await this.objectsRepository.getDictionaryOptions(
      chapterId,
      validate(ObjectListQuerySchema, query, InvalidObjectInputError),
    );
    if (options === null) throw new DictionaryChapterNotFoundError(chapterId);
    return options;
  }

  async mount(
    input: MountObjectDTO,
    actor: ObjectActorDTO = null,
  ): Promise<ObjectMountOutput> {
    const data = validate(MountObjectSchema, input, InvalidObjectInputError);
    const result = await this.objectsRepository.mount(
      data,
      validate(ObjectActorSchema, actor, InvalidObjectInputError),
    );
    if (result.status === "mounted") return result.allocation;
    return placementFailure(result, {
      objectId: data.object_id,
      rackId: data.rack_id,
      startUnit: data.start_unit,
      height: data.height,
    });
  }

  async unmount(
    id: ObjectIdDTO,
    actor: ObjectActorDTO = null,
  ): Promise<ObjectUnmountOutput> {
    id = validate(ObjectIdSchema, id, InvalidObjectInputError);
    const result = await this.objectsRepository.unmount(
      id,
      validate(ObjectActorSchema, actor, InvalidObjectInputError),
    );
    if (result.status === "unmounted") return result.allocation;
    return placementFailure(result, { objectId: id });
  }

  async move(
    input: MoveObjectDTO,
    actor: ObjectActorDTO = null,
  ): Promise<ObjectMoveOutput> {
    const data = validate(MoveObjectSchema, input, InvalidObjectInputError);
    const result = await this.objectsRepository.move(
      data,
      validate(ObjectActorSchema, actor, InvalidObjectInputError),
    );
    if (result.status === "moved") return result.allocation;
    return placementFailure(result, {
      objectId: data.object_id,
      rackId: data.destination_rack_id,
      startUnit: data.start_unit,
    });
  }
}
