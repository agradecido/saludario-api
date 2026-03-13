import Fastify from "fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError, type ZodTypeAny } from "zod";

import { createProblem, ProblemError } from "./common/errors.js";
import { createLogger } from "./common/logger.js";
import { requestIdHook } from "./common/request-id.js";
import { config } from "./config/index.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { categoriesRoutes } from "./modules/categories/categories.routes.js";
import { entriesRoutes } from "./modules/entries/entries.routes.js";
import { symptomsRoutes } from "./modules/symptoms/symptoms.routes.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { securityPlugin } from "./plugins/security.js";
import { sessionPlugin } from "./plugins/session.js";

export function zodValidatorCompiler({ schema }: { schema: unknown }) {
  return (data: unknown) => {
    const parsed = (schema as ZodTypeAny).safeParse(data);
    if (parsed.success) {
      return { value: parsed.data };
    }

    return { error: parsed.error };
  };
}

function isProblemError(error: unknown): error is ProblemError {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as ProblemError).statusCode === "number" &&
    typeof (error as ProblemError).problemCode === "string" &&
    typeof (error as ProblemError).title === "string"
  );
}

export function setAppErrorHandler(app: FastifyInstance | { setErrorHandler: (...args: any[]) => unknown }): void {
  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    if (isProblemError(error)) {
      const problem = createProblem(
        error.statusCode,
        error.problemCode,
        error.title,
        error.detail,
        {
          instance: request.url,
          request_id: request.id,
          ...error.extras
        }
      );

      reply.status(error.statusCode).type("application/problem+json").send(problem);
      return;
    }

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
    const code =
      statusCode === 404
        ? "NOT_FOUND"
        : statusCode === 429
          ? "RATE_LIMITED"
          : "INTERNAL_ERROR";
    const title =
      statusCode === 404
        ? "Not found"
        : statusCode === 429
          ? "Too Many Requests"
          : "Internal server error";
    const detail =
      statusCode === 404
        ? "The requested resource was not found."
        : statusCode === 429
          ? ((error as { message?: string }).message ?? "Too many requests.")
          : "An unexpected error occurred.";

    if (statusCode >= 500) {
      request.log.error(
        {
          err: error
        },
        "request failed"
      );
    }

    const problem = createProblem(statusCode, code, title, detail, {
      instance: request.url,
      request_id: request.id
    });

    reply.status(statusCode).type("application/problem+json").send(problem);
  });
}

export async function createApp() {
  const logger = createLogger(config.LOG_LEVEL);

  const app = Fastify({
    loggerInstance: logger
  });

  app.setValidatorCompiler(zodValidatorCompiler);
  app.addHook("onRequest", requestIdHook);

  await app.register(prismaPlugin);
  await app.register(sessionPlugin);
  await app.register(rateLimitPlugin);
  await app.register(securityPlugin);
  setAppErrorHandler(app);

  app.get("/api/v1/health", async () => {
    return { status: "ok" };
  });

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(entriesRoutes, { prefix: "/api/v1/entries" });
  await app.register(categoriesRoutes, { prefix: "/api/v1/categories" });
  await app.register(symptomsRoutes, { prefix: "/api/v1/internal/symptoms" });

  return app;
}
