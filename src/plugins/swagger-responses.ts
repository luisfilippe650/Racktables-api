import { z } from "zod";

const integer = z.number().int();
const text = z.string().nullable();
const numbers = z.array(integer);
const entity = z.object({
  id: integer,
  name: text,
  label: text,
  objtype_id: integer,
  asset_no: text,
  has_problems: z.enum(["yes", "no"]),
  comment: text,
});
const allocation = z.object({
  rack_id: integer.nullable(),
  rack_name: text,
  rack_count: integer,
  allocation_status: z.enum([
    "allocated",
    "not_allocated",
    "inconsistent_multiple_racks",
  ]),
});
const listObject = z.object({
  object_id: integer,
  object_name: text,
  object_label: text,
  asset_no: text,
  objtype_id: integer,
  object_type: text,
});
const dictionary = z.object({ id: integer, name: z.string() });
const space = z.object({
  rack_id: integer,
  unit_no: integer,
  atom: z.enum(["front", "interior", "rear"]),
  state: z.enum(["A", "U", "T"]),
  object_id: integer.nullable(),
  object_name: text,
});
const occupancy = z.object({
  rack_id: integer,
  rack_name: text,
  total_units: integer,
  occupied_units: numbers,
  unavailable_units: numbers,
  free_units: numbers,
});
const page = (items: z.ZodType) =>
  z.object({
    items: z.array(items),
    total: integer,
    page: integer,
    per_page: integer,
  });
const summary = allocation.extend({
  object_id: integer,
  common_name: text,
  visible_label: text,
  asset_tag: text,
  has_problems: z.enum(["yes", "no"]),
  comment: text,
  is_allocated: z.boolean(),
  row_name: text,
  location_name: text,
  attributes: z.record(
    z.string(),
    z.union([
      z.string(),
      z.number(),
      z.null(),
      z.object({
        value: integer.nullable(),
        available_options: z.array(dictionary).optional(),
      }),
    ]),
  ),
});
const error = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
const validationError = z.union([
  error,
  z.object({
    message: z.string(),
    errors: z.array(z.object({}).passthrough()),
  }),
]);

const outputs: Record<string, z.ZodType> = {
  "GET /row/by-name": entity.nullable(),
  "GET /rack/by-name": entity.nullable(),
  "GET /locations": z.array(entity),
  "GET /rows": z.array(entity),
  "GET /racks": page(entity),
  "GET /rack/:id/details": entity.extend({
    height: integer.nullable(),
    sort_order: integer.nullable(),
    row_id: integer.nullable(),
    row_name: text,
    location_id: integer.nullable(),
    location_name: text,
  }),
  "GET /rack/:id/occupancy": occupancy,
  "GET /racks/occupancy": page(occupancy),
  "GET /rack/:id/spaces": z.array(space),
  "GET /rack/:rackId/spaces/:unitNo/:atom": space.nullable(),
  "GET /rack/:rackId/objects/:objectId/spaces": z.array(space),
  "GET /objects": page(listObject.merge(allocation)),
  "GET /objects/all": page(
    listObject.extend({ has_problems: z.enum(["yes", "no"]), comment: text }),
  ),
  "GET /objects/types": page(
    z.object({ objtype_id: integer, objtype_name: text }),
  ),
  "GET /objects/dictionary/:chapter_id": page(dictionary),
  "GET /object/:id/summary": summary,
  "POST /object": z.object({ object: entity, ports_created: integer }),
  "PATCH /object/:id": z.object({
    object: entity,
    fixed_fields_updated: z.array(z.string()),
    dynamic_attributes_updated: integer,
  }),
  "POST /object/mount": z.object({
    rack_id: integer,
    object_id: integer,
    start_unit: integer,
    height: integer,
    end_unit: integer,
    molecule_id: integer,
  }),
  "DELETE /object/:id/mount": z.object({
    object_id: integer,
    rack_id: integer,
    units_removed: numbers,
    molecule_id: integer,
  }),
  "POST /object/move": z.object({
    object_id: integer,
    destination_rack_id: integer,
    start_unit: integer,
    source_rack_id: integer,
    end_unit: integer,
    height: integer,
    old_molecule_id: integer,
    new_molecule_id: integer,
  }),
};

function document(schema: z.ZodType, description: string) {
  return {
    ...z.toJSONSchema(schema, {
      target: "openapi-3.0",
      unrepresentable: "any",
    }),
    description,
  };
}

// These schemas are applied only by Swagger's transform, never by Fastify's serializer.
export function swaggerResponses(method: string, url: string) {
  if (
    !url.startsWith("/v1/racktables/") ||
    url.startsWith("/v1/racktables/docs")
  )
    return {};
  const path = url.slice("/v1/racktables".length);
  const noContent =
    (method === "DELETE" && !path.endsWith("/mount")) ||
    path.startsWith("/row/link/") ||
    path.startsWith("/row/unlink/");
  const created =
    method === "POST" &&
    ["/location", "/row", "/rack", "/object"].includes(path);
  const nullableLookup = path === "/row/by-name" || path === "/rack/by-name";
  const responses: Record<string, unknown> = {
    [noContent ? 204 : created ? 201 : 200]: noContent
      ? { type: "null", description: "Operation completed. No response body." }
      : document(
          outputs[`${method} ${path}`] ?? entity,
          created ? "Resource created." : "Operation completed.",
        ),
    400: document(validationError, "Invalid request."),
    500: document(error, "Internal or database error."),
  };
  if (
    path.includes(":") ||
    method !== "GET" ||
    (path.endsWith("/by-name") && !nullableLookup) ||
    path.endsWith("/by-service-tag")
  )
    responses[404] = document(error, "Resource not found.");
  if (
    method !== "GET" ||
    path.endsWith("/occupancy") ||
    (path.endsWith("/by-name") && !nullableLookup) ||
    path.endsWith("/by-service-tag")
  )
    responses[409] = document(
      error,
      "Conflicting name, allocation or dependencies.",
    );
  if (path.startsWith("/object") && method !== "GET")
    responses[403] = document(
      error,
      "Object type not allowed for this operation.",
    );
  if (method === "POST" || method === "PATCH") {
    responses[413] = document(error, "Request body too large.");
    responses[415] = document(error, "Unsupported content type.");
  }
  return { response: responses };
}
