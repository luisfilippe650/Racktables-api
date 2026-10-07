import { RacksService } from "./racks.service.js";
import {
  RacksSchema,
  RackIdParamsSchema,
  RackNameQuerySchema,
  RackListQuerySchema,
  RackObjectSpacesParamsSchema,
  UpdateRackSchema,
  RackSpaceParamsSchema,
} from "./schemas/racks.dto.js";
import { FastifyReply, FastifyRequest } from "fastify";

export class RacksController {
  constructor(private readonly racksService: RacksService) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const body = RacksSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        message: "Invalid body.",
        errors: body.error.issues,
      });
    }

    const rack = await this.racksService.create(body.data);
    return reply.status(201).send(rack);
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const body = UpdateRackSchema.safeParse(request.body);
    const params = RackIdParamsSchema.safeParse(request.params);

    if (!body.success) {
      return reply.status(400).send({
        message: "Invalid body.",
        errors: body.error.issues,
      });
    }

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }
    const update = await this.racksService.update(params.data.id, body.data);
    return reply.status(200).send(update);
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackIdParamsSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    await this.racksService.delete(params.data.id);
    return reply.status(204).send();
  }

  async get(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }
    const data = await this.racksService.get(params.data.id);
    return reply.status(200).send(data);
  }

  async getAll(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = RackListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        message: "Invalid query.",
        errors: query.error.issues,
      });
    }

    const data = await this.racksService.getAll(query.data);
    return reply.status(200).send(data);
  }

  async getByName(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = RackNameQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        message: "Invalid query.",
        errors: query.error.issues,
      });
    }

    const data = await this.racksService.getByName(query.data.name);
    return reply.status(200).send(data);
  }

  async getDetails(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const data = await this.racksService.getDetails(params.data.id);
    return reply.status(200).send(data);
  }

  async getOccupancy(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const data = await this.racksService.getOccupancy(params.data.id);
    return reply.status(200).send(data);
  }

  async getOccupancyAll(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = RackListQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        message: "Invalid query.",
        errors: query.error.issues,
      });
    }

    const data = await this.racksService.getOccupancyAll(query.data);
    return reply.status(200).send(data);
  }

  async getSpaces(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const data = await this.racksService.getSpaces(params.data.id);
    return reply.status(200).send(data);
  }

  async getSpace(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackSpaceParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const data = await this.racksService.getSpace(
      params.data.rackId,
      params.data.unitNo,
      params.data.atom,
    );
    return reply.status(200).send(data);
  }

  async getObjectSpaces(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const params = RackObjectSpacesParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        message: "Invalid params.",
        errors: params.error.issues,
      });
    }

    const data = await this.racksService.getObjectSpaces(
      params.data.rackId,
      params.data.objectId,
    );
    return reply.status(200).send(data);
  }
}
