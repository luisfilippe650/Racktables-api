import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../../shared/validation/validate.js";
import {
  DictionaryParamsSchema,
  ObjectAllQuerySchema,
  ObjectIdParamsSchema,
  ObjectListQuerySchema,
  ObjectNameQuerySchema,
  ObjectServiceTagQuerySchema,
  ObjectSummaryQuerySchema,
} from "./schemas/objects-query.dto.js";
import {
  MountObjectSchema,
  MoveObjectSchema,
} from "./schemas/objects-placement.dto.js";
import {
  ObjectsSchema,
  UpdateObjectAttributesSchema,
} from "./schemas/objects.dto.js";
import { InvalidObjectInputError } from "./errors/objects.errors.js";
import type { ObjectsService } from "./objects.service.js";

export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const body = validate(ObjectsSchema, request.body, InvalidObjectInputError);

    const result = await this.objectsService.create(body);

    return reply.status(201).send(result);
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = validate(
      ObjectIdParamsSchema,
      request.params,
      InvalidObjectInputError,
    );

    const body = validate(
      UpdateObjectAttributesSchema,
      request.body,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.update(id, body);

    return reply.status(200).send(result);
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = validate(
      ObjectIdParamsSchema,
      request.params,
      InvalidObjectInputError,
    );

    await this.objectsService.delete(id);

    return reply.status(204).send();
  }

  async get(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = validate(
      ObjectIdParamsSchema,
      request.params,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.get(id);

    return reply.status(200).send(result);
  }

  async getByName(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { name } = validate(
      ObjectNameQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getByName(name);

    return reply.status(200).send(result);
  }

  async getByServiceTag(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { service_tag } = validate(
      ObjectServiceTagQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getByServiceTag(service_tag);

    return reply.status(200).send(result);
  }

  async getAll(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = validate(
      ObjectListQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getAll(query);

    return reply.status(200).send(result);
  }

  async getAllObjects(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = validate(
      ObjectAllQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getAllObjects(query);

    return reply.status(200).send(result);
  }

  async getTypes(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const query = validate(
      ObjectListQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getTypes(query);

    return reply.status(200).send(result);
  }

  async getSummary(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = validate(
      ObjectIdParamsSchema,
      request.params,
      InvalidObjectInputError,
    );

    const { include_options } = validate(
      ObjectSummaryQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getSummary(id, include_options);

    return reply.status(200).send(result);
  }

  async getDictionaryOptions(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { chapter_id } = validate(
      DictionaryParamsSchema,
      request.params,
      InvalidObjectInputError,
    );

    const query = validate(
      ObjectListQuerySchema,
      request.query,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.getDictionaryOptions(
      chapter_id,
      query,
    );

    return reply.status(200).send(result);
  }

  async mount(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const body = validate(
      MountObjectSchema,
      request.body,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.mount(body);

    return reply.status(200).send(result);
  }

  async unmount(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const { id } = validate(
      ObjectIdParamsSchema,
      request.params,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.unmount(id);

    return reply.status(200).send(result);
  }

  async move(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const body = validate(
      MoveObjectSchema,
      request.body,
      InvalidObjectInputError,
    );

    const result = await this.objectsService.move(body);

    return reply.status(200).send(result);
  }
}
