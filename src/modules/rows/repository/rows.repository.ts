import {
  RowInput,
  RowOutput,
  RowUpdate,
  RowWithLocationInput,
  RowCreateResult,
  RowCreateWithLocationResult,
  RowUpdateResult,
  RowDeleteResult,
  RowLinkToLocationResult,
  RowUnlinkFromLocationResult,
} from "../entity/rows.entity.js";

export abstract class RowRepository {
  abstract create(data: RowInput): Promise<RowCreateResult>;

  abstract createWithLocation(
    data: RowWithLocationInput,
  ): Promise<RowCreateWithLocationResult>;

  abstract delete(id: number): Promise<RowDeleteResult>;

  abstract update(data: RowUpdate): Promise<RowUpdateResult>;

  abstract linkToLocation(
    rowId: number,
    locationId: number,
  ): Promise<RowLinkToLocationResult>;

  abstract unlinkFromLocation(
    rowId: number,
    locationId: number,
  ): Promise<RowUnlinkFromLocationResult>;

  abstract get(id: number): Promise<RowOutput | null>;

  abstract getByName(name: string): Promise<RowOutput | null>;

  abstract getAll(): Promise<RowOutput[]>;
}
