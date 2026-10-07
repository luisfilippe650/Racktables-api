import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      login: string;
    };

    user: {
      sub: string;
      login: string;
    };
  }
}
