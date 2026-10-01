import type { FastifyInstance } from "fastify";
import { RacksController } from "./racks.controller.js";
import { RacksService } from "./racks.service.js";
import { RacksPrismaRepository } from "./repository/racks.prisma.js";

const controller = new RacksController(
  new RacksService(new RacksPrismaRepository()),
);

export async function racksRouter(app: FastifyInstance): Promise<void> {
  app.post("/rack", (request, reply) => controller.create(request, reply));
  app.patch("/rack/:id", (request, reply) => controller.update(request, reply));
  app.delete("/rack/:id", (request, reply) =>
    controller.delete(request, reply),
  );
  app.get("/rack/:id", (request, reply) => controller.get(request, reply));
  app.get("/racks", (request, reply) => controller.getAll(request, reply));
  app.get("/rack/by-name", (request, reply) =>
    controller.getByName(request, reply),
  );
  app.get("/rack/:id/details", (request, reply) =>
    controller.getDetails(request, reply),
  );
  app.get("/rack/:id/occupancy", (request, reply) =>
    controller.getOccupancy(request, reply),
  );
  app.get("/racks/occupancy", (request, reply) =>
    controller.getOccupancyAll(request, reply),
  );
  app.get("/rack/:id/spaces", (request, reply) =>
    controller.getSpaces(request, reply),
  );
  app.get("/rack/:rackId/spaces/:unitNo/:atom", (request, reply) =>
    controller.getSpace(request, reply),
  );
  app.get("/rack/:rackId/objects/:objectId/spaces", (request, reply) =>
    controller.getObjectSpaces(request, reply),
  );
}
