import type { FastifyReply, FastifyRequest } from "fastify";
import { ObjectIdParamsSchema } from "../../shared/schemas/object.schema.js";
import { RowNameSchema } from "./dto/rows.dto.js";
import {
  RowLocationParamsSchema,
  RowSchema,
  UpdateRowSchema,
} from "./dto/rows.dto.js";
import { RowService } from "./rows.service.js";
import { Row } from "../../generated/prisma/client.js";
import { RowOutput } from "./entity/rows.entity.js";

export class RowsController {
  constructor(private readonly rowService: RowService) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const body = RowSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        message: "Invalid body.",
        errors: body.error.issues,
      });
    }

    const row = await this.rowService.create(body.data);

    return reply.status(201).send(row);
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = ObjectIdParamsSchema.safeParse(request.params);
    const body = UpdateRowSchema.safeParse(request.body);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    if (!body.success) {
      return reply.status(400).send({
        message: "Invalid body.",
        errors: body.error.issues,
      });
    }

    const row = await this.rowService.update(params.data.id, body.data);

    return reply.status(200).send(row);
  }

  async linkToLocation(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RowLocationParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    await this.rowService.linkToLocation(
      params.data.rowId,
      params.data.locationId,
    );

    return reply.status(204).send();
  }

  async unlinkFromLocation(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RowLocationParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    await this.rowService.unlinkFromLocation(
      params.data.rowId,
      params.data.locationId,
    );

    return reply.status(204).send();
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = ObjectIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    await this.rowService.delete(params.data.id);

    return reply.status(204).send();
  }

  async get( request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const params = ObjectIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const row = await this.rowService.get(params.data.id);

    return reply.status(200).send(row);
  }

  async getByName(request: FastifyRequest, reply : FastifyReply):Promise<FastifyReply> {
    const params = RowNameSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const row = await this.rowService.getByName(params.data);

    return reply.status(200).send(row);
  }

  async getAll(request: FastifyRequest , reply: FastifyReply): Promise<FastifyReply[]> {

    const rows = await this.rowService.getAll();

    return reply.status(200).send(rows);
  }
}
