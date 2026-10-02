import { errorCodes, type FastifyError, type FastifyInstance } from "fastify";
import { ApplicationError } from "./application.error.js";

const requestParserErrors = [
  errorCodes.FST_ERR_CTP_INVALID_JSON_BODY,
  errorCodes.FST_ERR_CTP_EMPTY_JSON_BODY,
  errorCodes.FST_ERR_CTP_INVALID_MEDIA_TYPE,
  errorCodes.FST_ERR_CTP_BODY_TOO_LARGE,
];

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    if (
      requestParserErrors.some((ParserError) => error instanceof ParserError)
    ) {
      const parserError = error as FastifyError;
      return reply.status(parserError.statusCode ?? 400).send({
        code: parserError.code,
        message: parserError.message,
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
    });
  });
}
