import { LocationsController } from "./locations.controller.js";
import { LocationsService } from "./locations.service.js";
import { LocationPrismaRepository } from "./repository/locations.prisma.js";
import type { FastifyInstance } from "fastify";

const locationsRepository = new LocationPrismaRepository();
const locationsService = new LocationsService(locationsRepository);
const locationsController = new LocationsController(locationsService);

export async function locationsRouter(app: FastifyInstance): Promise<void> {
  app.post("/location", { schema: { tags: ["Locations"] } }, (request, reply) =>
    locationsController.create(request, reply),
  );

  app.delete("/location/:id", { schema: { tags: ["Locations"] } }, (request, reply) =>
    locationsController.delete(request, reply),
  );

  app.patch("/location/:id", { schema: { tags: ["Locations"] } }, (request, reply) =>
    locationsController.update(request, reply),
  );

  app.get("/location/:id", { schema: { tags: ["Locations"] } }, (request, reply) =>
    locationsController.get(request, reply),
  );

  app.get("/locations", { schema: { tags: ["Locations"] } }, (request, reply) =>
    locationsController.getAll(request, reply),
  );
}
