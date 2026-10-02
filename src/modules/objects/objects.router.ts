import type { FastifyInstance } from "fastify";
import { ObjectsController } from "./objects.controller.js";
import { ObjectsService } from "./objects.service.js";
import { ObjectsPrismaRepository } from "./repository/objects.prisma.js";
import type { ObjectsRepository } from "./repository/objects.repository.js";

export type ObjectsRouterOptions = { repository?: ObjectsRepository };

export async function objectsRouter(
  app: FastifyInstance,
  options: ObjectsRouterOptions = {},
): Promise<void> {
  const controller = new ObjectsController(
    new ObjectsService(options.repository ?? new ObjectsPrismaRepository()),
  );

  app.post("/object", { schema: { tags: ["Objects"] } }, (request, reply) => controller.create(request, reply));

  app.patch("/object/:id", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.update(request, reply),
  );

  app.delete("/object/:id", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.delete(request, reply),
  );

  app.get("/object/:id", { schema: { tags: ["Objects"] } }, (request, reply) => controller.get(request, reply));

  app.get("/object/by-name", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.getByName(request, reply),
  );

  app.get("/object/by-service-tag", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.getByServiceTag(request, reply),
  );

  app.get("/objects", { schema: { tags: ["Objects"] } }, (request, reply) => controller.getAll(request, reply));

  app.get("/objects/all", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.getAllObjects(request, reply),
  );

  app.get("/objects/types", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.getTypes(request, reply),
  );

  app.get("/object/:id/summary", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.getSummary(request, reply),
  );

  app.get("/objects/dictionary/:chapter_id", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.getDictionaryOptions(request, reply),
  );

  app.post("/object/mount", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.mount(request, reply),
  );

  app.delete("/object/:id/mount", { schema: { tags: ["Objects"] } }, (request, reply) =>
    controller.unmount(request, reply),
  );

  app.post("/object/move", { schema: { tags: ["Objects"] } }, (request, reply) => controller.move(request, reply));
}
