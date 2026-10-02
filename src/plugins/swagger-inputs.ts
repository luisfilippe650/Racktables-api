import { z } from "zod";
import { CreateLocationSchema as CreateLocationSchema_locations } from "../modules/locations/dto/locations.dto.js";
import { UpdateLocationSchema as UpdateLocationSchema_locations } from "../modules/locations/dto/locations.dto.js";
import { ObjectIdParamsSchema as ObjectIdParamsSchema_locations } from "../shared/schemas/object.schema.js";
import { ObjectIdParamsSchema as ObjectIdParamsSchema_rows } from "../shared/schemas/object.schema.js";
import { RowNameQuerySchema as RowNameQuerySchema_rows } from "../modules/rows/dto/rows.dto.js";
import { RowLocationParamsSchema as RowLocationParamsSchema_rows } from "../modules/rows/dto/rows.dto.js";
import { RowSchema as RowSchema_rows } from "../modules/rows/dto/rows.dto.js";
import { UpdateRowSchema as UpdateRowSchema_rows } from "../modules/rows/dto/rows.dto.js";
import { RacksSchema as RacksSchema_racks } from "../modules/racks/dto/racks.dto.js";
import { RackIdParamsSchema as RackIdParamsSchema_racks } from "../modules/racks/dto/racks.dto.js";
import { RackNameQuerySchema as RackNameQuerySchema_racks } from "../modules/racks/dto/racks.dto.js";
import { RackListQuerySchema as RackListQuerySchema_racks } from "../modules/racks/dto/racks.dto.js";
import { RackObjectSpacesParamsSchema as RackObjectSpacesParamsSchema_racks } from "../modules/racks/dto/racks.dto.js";
import { UpdateRackSchema as UpdateRackSchema_racks } from "../modules/racks/dto/racks.dto.js";
import { RackSpaceParamsSchema as RackSpaceParamsSchema_racks } from "../modules/racks/dto/racks.dto.js";
import { DictionaryParamsSchema as DictionaryParamsSchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { ObjectAllQuerySchema as ObjectAllQuerySchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { ObjectIdParamsSchema as ObjectIdParamsSchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { ObjectListQuerySchema as ObjectListQuerySchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { ObjectNameQuerySchema as ObjectNameQuerySchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { ObjectServiceTagQuerySchema as ObjectServiceTagQuerySchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { ObjectSummaryQuerySchema as ObjectSummaryQuerySchema_objects } from "../modules/objects/dto/objects-query.dto.js";
import { MountObjectSchema as MountObjectSchema_objects } from "../modules/objects/dto/objects-placement.dto.js";
import { MoveObjectSchema as MoveObjectSchema_objects } from "../modules/objects/dto/objects-placement.dto.js";
import { ObjectsSchema as ObjectsSchema_objects } from "../modules/objects/dto/objects.dto.js";
import { UpdateObjectAttributesSchema as UpdateObjectAttributesSchema_objects } from "../modules/objects/dto/objects.dto.js";

// Documentation uses input DTOs without changing controller validation.
function documentSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, {
    io: "input",
    target: "openapi-3.0",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema instanceof z.ZodNumber) {
        Object.assign(
          jsonSchema,
          z.toJSONSchema(zodSchema, { io: "output", target: "openapi-3.0" }),
        );
      }
    },
  });
}

export const swaggerInputs: Record<string, Record<string, unknown>> = {
  "POST /v1/racktables/location": {
    body: documentSchema(CreateLocationSchema_locations),
  },
  "DELETE /v1/racktables/location/:id": {
    params: documentSchema(ObjectIdParamsSchema_locations),
  },
  "PATCH /v1/racktables/location/:id": {
    params: documentSchema(ObjectIdParamsSchema_locations),
    body: documentSchema(UpdateLocationSchema_locations),
  },
  "GET /v1/racktables/location/:id": {
    params: documentSchema(ObjectIdParamsSchema_locations),
  },
  "POST /v1/racktables/row": { body: documentSchema(RowSchema_rows) },
  "DELETE /v1/racktables/row/:id": {
    params: documentSchema(ObjectIdParamsSchema_rows),
  },
  "GET /v1/racktables/row/:id": {
    params: documentSchema(ObjectIdParamsSchema_rows),
  },
  "GET /v1/racktables/row/by-name": {
    querystring: documentSchema(RowNameQuerySchema_rows),
  },
  "PATCH /v1/racktables/row/:id": {
    params: documentSchema(ObjectIdParamsSchema_rows),
    body: documentSchema(UpdateRowSchema_rows),
  },
  "PATCH /v1/racktables/row/link/:rowId/:locationId": {
    params: documentSchema(RowLocationParamsSchema_rows),
  },
  "PATCH /v1/racktables/row/unlink/:rowId/:locationId": {
    params: documentSchema(RowLocationParamsSchema_rows),
  },
  "POST /v1/racktables/rack": { body: documentSchema(RacksSchema_racks) },
  "PATCH /v1/racktables/rack/:id": {
    body: documentSchema(UpdateRackSchema_racks),
    params: documentSchema(RackIdParamsSchema_racks),
  },
  "DELETE /v1/racktables/rack/:id": {
    params: documentSchema(RackIdParamsSchema_racks),
  },
  "GET /v1/racktables/rack/:id": {
    params: documentSchema(RackIdParamsSchema_racks),
  },
  "GET /v1/racktables/racks": {
    querystring: documentSchema(RackListQuerySchema_racks),
  },
  "GET /v1/racktables/rack/by-name": {
    querystring: documentSchema(RackNameQuerySchema_racks),
  },
  "GET /v1/racktables/rack/:id/details": {
    params: documentSchema(RackIdParamsSchema_racks),
  },
  "GET /v1/racktables/rack/:id/occupancy": {
    params: documentSchema(RackIdParamsSchema_racks),
  },
  "GET /v1/racktables/racks/occupancy": {
    querystring: documentSchema(RackListQuerySchema_racks),
  },
  "GET /v1/racktables/rack/:id/spaces": {
    params: documentSchema(RackIdParamsSchema_racks),
  },
  "GET /v1/racktables/rack/:rackId/spaces/:unitNo/:atom": {
    params: documentSchema(RackSpaceParamsSchema_racks),
  },
  "GET /v1/racktables/rack/:rackId/objects/:objectId/spaces": {
    params: documentSchema(RackObjectSpacesParamsSchema_racks),
  },
  "POST /v1/racktables/object": { body: documentSchema(ObjectsSchema_objects) },
  "PATCH /v1/racktables/object/:id": {
    params: documentSchema(ObjectIdParamsSchema_objects),
    body: documentSchema(UpdateObjectAttributesSchema_objects),
  },
  "DELETE /v1/racktables/object/:id": {
    params: documentSchema(ObjectIdParamsSchema_objects),
  },
  "GET /v1/racktables/object/:id": {
    params: documentSchema(ObjectIdParamsSchema_objects),
  },
  "GET /v1/racktables/object/by-name": {
    querystring: documentSchema(ObjectNameQuerySchema_objects),
  },
  "GET /v1/racktables/object/by-service-tag": {
    querystring: documentSchema(ObjectServiceTagQuerySchema_objects),
  },
  "GET /v1/racktables/objects": {
    querystring: documentSchema(ObjectListQuerySchema_objects),
  },
  "GET /v1/racktables/objects/all": {
    querystring: documentSchema(ObjectAllQuerySchema_objects),
  },
  "GET /v1/racktables/objects/types": {
    querystring: documentSchema(ObjectListQuerySchema_objects),
  },
  "GET /v1/racktables/object/:id/summary": {
    params: documentSchema(ObjectIdParamsSchema_objects),
    querystring: documentSchema(ObjectSummaryQuerySchema_objects),
  },
  "GET /v1/racktables/objects/dictionary/:chapter_id": {
    params: documentSchema(DictionaryParamsSchema_objects),
    querystring: documentSchema(ObjectListQuerySchema_objects),
  },
  "POST /v1/racktables/object/mount": {
    body: documentSchema(MountObjectSchema_objects),
  },
  "DELETE /v1/racktables/object/:id/mount": {
    params: documentSchema(ObjectIdParamsSchema_objects),
  },
  "POST /v1/racktables/object/move": {
    body: documentSchema(MoveObjectSchema_objects),
  },
};
