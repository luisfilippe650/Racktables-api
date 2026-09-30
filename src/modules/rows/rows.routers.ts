import { RowPrismaRepository } from "./repository/rows.prisma.js";
import { RowService } from "./rows.service.js";
import { RowsController } from "./rows.controller.js";
import { FastifyInstance } from "fastify";

const rowRepository = new RowPrismaRepository();
const rowService = new RowService(rowRepository);
const rowController = new RowsController(rowService);

async function routers(app: FastifyInstance): Promise<void> {
  app.post("/row", (request, reply) => rowController.create(request, reply));

  app.delete("/row/:id", (request, reply) =>
    rowController.delete(request, reply),
  );
  app.get("/row/:id", (request, reply) => rowController.get(request, reply));

  app.get("/row/:name", (request, reply) =>
    rowController.getByName(request, reply),
  );

  app.get("/rows", (request, reply) => rowService.getAll());

  app.patch("/row/:id", (request, reply) =>
    rowController.update(request, reply),
  );

  app.patch("/row/link/:idRow/:idLocation", (request, reply) =>
    rowController.linkToLocation(request, reply),
  );

  app.patch("/row/unlink/:idRow/:idLocation", (request, reply) =>
    rowController.unlinkFromLocation(request, reply),
  );
}
