import { LocationsController } from "./locations.controller.js";
import { LocationsService } from "./locations.service.js";
import { LocationPrismaRepository } from "./repository/locations.prisma.js";
import { FastifyInstance } from "fastify";


const locationsRepository = new LocationPrismaRepository();
const locationsService = new LocationsService(locationsRepository);
const locationsController = new LocationsController(locationsService);


async function routers(app: FastifyInstance) {

    app.post("/location", (request, reply) => locationsController.create(request, reply));

    app.delete("/location/:id", (request , reply ) => locationsController.delete(request, reply));

    app.patch("/location/:id", (request, reply) => locationsController.update(request, reply));

    app.get("/location/:id",(request , reply) => locationsController.get(request, reply));

    app.get("/locations", (request,reply) => locationsController.getAll(request, reply));
}


