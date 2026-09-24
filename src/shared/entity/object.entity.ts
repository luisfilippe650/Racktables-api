export type ObjectEntity = {
  id: number;
  name: string | null;
  label: string | null;
  objtype_id: number;
  asset_no: string | null;
  has_problems: "yes" | "no";
  comment: string | null;
};
