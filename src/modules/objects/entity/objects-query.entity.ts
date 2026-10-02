import type { ObjectAllocation } from "./objects-placement.entity.js";

export type ObjectPagination = { page: number; per_page: number };

export type ObjectPage<T> = ObjectPagination & { items: T[]; total: number };

export type ObjectAllQuery = ObjectPagination & { search?: string };

export type ObjectListOutput = {
  object_id: number;
  object_name: string | null;
  object_label: string | null;
  asset_no: string | null;
  objtype_id: number;
  object_type: string | null;
} & ObjectAllocation;

export type ObjectAllOutput = Omit<ObjectListOutput, keyof ObjectAllocation> & {
  has_problems: "yes" | "no";
  comment: string | null;
};

export type ObjectTypeOutput = {
  objtype_id: number;
  objtype_name: string | null;
};

export type DictionaryOption = { id: number; name: string };

export type ObjectAttributeValue =
  | string
  | number
  | null
  | {
      value: number | null;
      available_options?: DictionaryOption[];
    };

export type ObjectSummaryOutput = ObjectAllocation & {
  object_id: number;
  common_name: string | null;
  visible_label: string | null;
  asset_tag: string | null;
  has_problems: "yes" | "no";
  comment: string | null;
  is_allocated: boolean;
  row_name: string | null;
  location_name: string | null;
  attributes: Record<string, ObjectAttributeValue>;
};
