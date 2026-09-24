import { LocationsService } from "./locations.service.js";
import {
  CreateLocationSchema,
  UpdateLocationSchema,
} from "./dto/locations.dto.js";
import { ObjectIdParamsSchema } from "../../shared/schemas/object.schema.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { LocationOutput } from "./entity/locations.entity.js";

export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<LocationOutput | null> {
    const result = CreateLocationSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        menssage: "Invalid request body.",
        errors: result.error.issues,
      });
    }

    return await this.locationsService.create(result.data);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = ObjectIdParamsSchema.safeParse(request.params);

    if (!result.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: result.error.issues,
      });
    }

    return this.locationsService.delete(result.data.id);
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<LocationOutput | void> {
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

    return this.locationsService.updateLocation({
      id: paramsResult.data.id,
      name: bodyResult.data.name,
    });
  }

  async get(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<LocationOutput> {
    const params = ObjectIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const data = await this.locationsService.getlocation(params.data.id);

    return reply.status(200).send(data);
  }

  async getAll(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<LocationOutput[]> {
    const data = await this.locationsService.getAllLocations();

    return reply.status(200).send(data);
  }
}
