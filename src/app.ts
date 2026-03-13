import Fastify, { type FastifyInstance } from "fastify";
import { ZodError, type ZodTypeAny } from "zod";

import { createProblem } from "./common/errors.js";
import { createLogger } from "./common/logger.js";
import { requestIdHook } from "./common/request-id.js";
import { config } from "./config/index.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { categoriesRoutes } from "./modules/categories/categories.routes.js";
import { entriesRoutes } from "./modules/entries/entries.routes.js";
import { symptomsRoutes } from "./modules/symptoms/symptoms.routes.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { sessionPlugin } from "./plugins/session.js";

function zodValidatorCompiler({ schema }: { schema: unknown }) {
  return (data: unknown) => {
    const parsed = (schema as ZodTypeAny).safeParse(data);
    if (parsed.success) {
      return { value: parsed.data };
    }

    return { error: parsed.error };
  };
}

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: createLogger(config.LOG_LEVEL)
  });

  app.setValidatorCompiler(zodValidatorCompiler);
  app.addHook("onRequest", requestIdHook);

  await app.register(prismaPlugin);
  await app.register(sessionPlugin);
  await app.register(rateLimitPlugin);

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(entriesRoutes, { prefix: "/api/v1/entries" });
  await app.register(categoriesRoutes, { prefix: "/api/v1/categories" });
  await app.register(symptomsRoutes, { prefix: "/api/v1/internal/symptoms" });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const problem = createProblem(
        400,
        "VALIDATION_ERROR",
        "Validation error",
        "One or more fields are invalid.",
        {
          instance: request.url,
          request_id: request.id,
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message
          }))
        }
      );

      reply.status(400).type("application/problem+json").send(problem);
      return;
    }

    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? ((error as { statusCode: number }).statusCode ?? 500)
        : 500;
    const code = statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";
    const title = statusCode === 404 ? "Not found" : "Internal server error";
    const detail =
      statusCode === 404
        ? "The requested resource was not found."
        : "An unexpected error occurred.";

    const problem = createProblem(statusCode, code, title, detail, {
      instance: request.url,
      request_id: request.id
    });

    reply.status(statusCode).type("application/problem+json").send(problem);
  });

  return app;
}
