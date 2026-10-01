import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export function registerSwagger(app: FastifyInstance): void {
  app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "RackTables API",
        description: "API de gerenciamento do RackTables.",
        version: "1.0.0",
      },
    },
  });
  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}
