import type { FastifyReply, FastifyRequest } from "fastify";
import { LocationsService } from "./locations.service.js";
import {
  CreateLocationSchema,
  UpdateLocationSchema,
} from "./schemas/locations.dto.js";
import { ObjectIdParamsSchema } from "../../shared/schemas/object.schema.js";

export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const result = CreateLocationSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        message: "Invalid request body.",
        errors: result.error.issues,
      });
    }
    const location = await this.locationsService.create(result.data);

    return reply.status(201).send(location);
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const result = ObjectIdParamsSchema.safeParse(request.params);

    if (!result.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: result.error.issues,
      });
    }

    await this.locationsService.delete(result.data.id);

    return reply.status(204).send();
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const paramsResult = ObjectIdParamsSchema.safeParse(request.params);
    const bodyResult = UpdateLocationSchema.safeParse(request.body);

    if (!paramsResult.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: paramsResult.error.issues,
      });
    }

    if (!bodyResult.success) {
      return reply.status(400).send({
        message: "Invalid request body.",
        errors: bodyResult.error.issues,
      });
    }

    const location = await this.locationsService.update(
      paramsResult.data.id,
      bodyResult.data,
    );

    return reply.status(200).send(location);
  }

  async get(
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

    const data = await this.locationsService.get(params.data.id);

    return reply.status(200).send(data);
  }

  async getAll(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const data = await this.locationsService.getAll();

    return reply.status(200).send(data);
  }
}
