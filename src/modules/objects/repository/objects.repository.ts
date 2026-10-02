import type {
  ObjectCreateResult,
  ObjectDeleteResult,
  ObjectInput,
  ObjectLookupResult,
  ObjectOutput,
  ObjectUpdate,
  ObjectUpdateResult,
} from "../entity/objects.entity.js";
import type {
  DictionaryOption,
  ObjectAllOutput,
  ObjectAllQuery,
  ObjectListOutput,
  ObjectPage,
  ObjectPagination,
  ObjectSummaryOutput,
  ObjectTypeOutput,
} from "../entity/objects-query.entity.js";
import type {
  ObjectMountInput,
  ObjectMountResult,
  ObjectMoveInput,
  ObjectMoveResult,
  ObjectUnmountResult,
} from "../entity/objects-placement.entity.js";

export abstract class ObjectsRepository {

  abstract create(data: ObjectInput, actor?: string | null,): Promise<ObjectCreateResult>;

  abstract update(data: ObjectUpdate, actor?: string | null,): Promise<ObjectUpdateResult>;

  abstract delete(id: number, actor?: string | null,): Promise<ObjectDeleteResult>;

  abstract get(id: number): Promise<ObjectOutput | null>;

  /** Existing duplicate names must be reported, never resolved arbitrarily. */
  abstract getByName(name: string): Promise<ObjectLookupResult>;

  abstract getByServiceTag(serviceTag: string): Promise<ObjectLookupResult>;

  /** Equipment only, with current rack allocation. */
  abstract getAll(pagination?: ObjectPagination,): Promise<ObjectPage<ObjectListOutput>>;

  /** Includes racks, rows and locations, matching the legacy /all endpoint. */
  abstract getAllObjects(query?: ObjectAllQuery,): Promise<ObjectPage<ObjectAllOutput>>;

  abstract getTypes(pagination?: ObjectPagination,): Promise<ObjectPage<ObjectTypeOutput>>;

  abstract getSummary(id: number, includeOptions?: boolean,): Promise<ObjectSummaryOutput | null>;

  /** null means the chapter has no dictionary entries. */
  abstract getDictionaryOptions(chapterId: number, pagination?: ObjectPagination,): Promise<ObjectPage<DictionaryOption> | null>;

  /** start_unit is the highest unit; allocation extends down toward U1. */
  abstract mount(data: ObjectMountInput, actor?: string | null,): Promise<ObjectMountResult>;

  abstract unmount(id: number, actor?: string | null,): Promise<ObjectUnmountResult>;

  /** Discovers the source rack and height from a complete current allocation. */
  abstract move(data: ObjectMoveInput, actor?: string | null,): Promise<ObjectMoveResult>;

}
