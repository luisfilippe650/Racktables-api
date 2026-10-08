import { swaggerInputs } from "./swagger-inputs.js";
import { swaggerResponses } from "./swagger-responses.js";
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export function registerSwagger(
  app: FastifyInstance,
  routePrefix = "/docs",
): void {
  app.register(swagger, {
    transform: ({ schema, url, route }) => {
      const documentedSchema = {
        security: [{ bearerAuth: [] }],
        ...schema,
        ...swaggerResponses(String(route.method).toUpperCase(), url),
        ...swaggerInputs[`${String(route.method).toUpperCase()} ${url}`],
      };
      if (documentedSchema.security.some((requirement) => "bearerAuth" in requirement)) {
        documentedSchema.response = {
          ...(documentedSchema.response as Record<string, unknown> | undefined),
          401: {
            description: "Token ausente, inválido ou expirado.",
            type: "object",
            required: ["message"],
            properties: { message: { type: "string" } },
          },
        };
      }
      return { schema: documentedSchema, url };
    },
    openapi: {
      openapi: "3.0.3",
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Faça login em POST /auth/login e cole somente access_token no botão Authorize. O Swagger envia automaticamente o header Authorization: Bearer <token> nas rotas protegidas.",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      info: {
        title: "RackTables API",
        description:
          "The RackTables REST API is an **open-source integration layer** developed in **TypeScript**, designed to provide read and write operations directly on the RackTables MySQL database — an open-source system for data center inventory and management.\n" +
          "\n" +
          "The API abstracts the underlying SQL queries through standardized RESTful endpoints, allowing the management of the main RackTables resources, including **Locations, Rows, Racks, Objects, and Allocations**.\n" +
          "\n" +
          "Developed at **INPE — Instituto Nacional de Pesquisas Espaciais (Brazil)**, the solution aims to simplify and standardize programmatic access to infrastructure inventory, enabling seamless integrations with other systems, applications, and automation tools.\n" +
          "\n" +
          "As an **open-source project**, the API can also be studied, adapted, and extended by the community to support different infrastructure management and integration needs.",
        version: "1.5.0",
      },
    },
  });
  app.register(swaggerUi, {
    routePrefix,
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}
