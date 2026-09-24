import type { ObjectEntity } from "../../src/shared/entity/object.entity.js";

type ExpectedObjectEntity = {
  id: number;
  name: string | null;
  label: string | null;
  objtype_id: number;
  asset_no: string | null;
  has_problems: "yes" | "no";
  comment: string | null;
};

type IsExact<Actual, Expected> =
  (<Value>() => Value extends Actual ? 1 : 2) extends <Value>() =>
    Value extends Expected ? 1 : 2
    ? (<Value>() => Value extends Expected ? 1 : 2) extends <Value>() =>
        Value extends Actual ? 1 : 2
      ? true
      : false
    : false;

type Assert<Condition extends true> = Condition;

export type ObjectEntityMatchesSharedContract = Assert<
  IsExact<ObjectEntity, ExpectedObjectEntity>
>;
