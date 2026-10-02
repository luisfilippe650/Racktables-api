import type { FastifyInstance } from "fastify";
import { ObjectsController } from "./objects.controller.js";
import { ObjectsService } from "./objects.service.js";
import { ObjectsPrismaRepository } from "./repository/objects.prisma.js";
import type { ObjectsRepository } from "./repository/objects.repository.js";

export type ObjectsRouterOptions = { repository?: ObjectsRepository };

const controller = new ObjectsController(
  new ObjectsService(new ObjectsPrismaRepository()),
);

export async function objectsRouter(app: FastifyInstance): Promise<void> {
  app.post("/object", (request, reply) => controller.create(request, reply));

  app.patch("/object/:id", (request, reply) =>
    controller.update(request, reply),
  );

  app.delete("/object/:id", (request, reply) =>
    controller.delete(request, reply),
  );

  app.get("/object/:id", (request, reply) => controller.get(request, reply));

  app.get("/object/by-name", (request, reply) =>
    controller.getByName(request, reply),
  );

  app.get("/object/by-service-tag", (request, reply) =>
    controller.getByServiceTag(request, reply),
  );

  app.get("/objects", (request, reply) => controller.getAll(request, reply));

  app.get("/objects/all", (request, reply) =>
    controller.getAllObjects(request, reply),
  );

  app.get("/objects/types", (request, reply) =>
    controller.getTypes(request, reply),
  );

  app.get("/object/:id/summary", (request, reply) =>
    controller.getSummary(request, reply),
  );

  app.get("/objects/dictionary/:chapter_id", (request, reply) =>
    controller.getDictionaryOptions(request, reply),
  );

  app.post("/object/mount", (request, reply) =>
    controller.mount(request, reply),
  );

  app.delete("/object/:id/mount", (request, reply) =>
    controller.unmount(request, reply),
  );

  app.post("/object/move", (request, reply) => controller.move(request, reply));
}
