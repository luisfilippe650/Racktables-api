import { RowPrismaRepository } from "./repository/rows.prisma.js";
import { RowService } from "./rows.service.js";
import { RowsController } from "./rows.controller.js";
import type { FastifyInstance } from "fastify";

import type { RowRepository } from "./repository/rows.repository.js";

export type RowsRouterOptions = { repository?: RowRepository };

export async function rowsRouter(
  app: FastifyInstance,
  options: RowsRouterOptions = {},
): Promise<void> {
  const rowService = new RowService(
    options.repository ?? new RowPrismaRepository(),
  );
  const rowController = new RowsController(rowService);
  app.post("/row", { schema: { tags: ["Rows"] } }, (request, reply) => rowController.create(request, reply));

  app.delete("/row/:id", { schema: { tags: ["Rows"] } }, (request, reply) =>
    rowController.delete(request, reply),
  );
  app.get("/row/:id", { schema: { tags: ["Rows"] } }, (request, reply) => rowController.get(request, reply));

  app.get("/row/by-name", { schema: { tags: ["Rows"] } }, (request, reply) =>
    rowController.getByName(request, reply),
  );

  app.get("/rows", { schema: { tags: ["Rows"] } }, (request, reply) => rowController.getAll(request, reply));

  app.patch("/row/:id", { schema: { tags: ["Rows"] } }, (request, reply) =>
    rowController.update(request, reply),
  );

  app.patch("/row/link/:rowId/:locationId", { schema: { tags: ["Rows"] } }, (request, reply) =>
    rowController.linkToLocation(request, reply),
  );

  app.patch("/row/unlink/:rowId/:locationId", { schema: { tags: ["Rows"] } }, (request, reply) =>
    rowController.unlinkFromLocation(request, reply),
  );
}
