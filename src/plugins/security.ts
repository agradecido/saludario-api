import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { createProblemError } from "../common/errors.js";
import { config } from "../config/index.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER_NAME = "x-requested-with";
const CSRF_HEADER_VALUE = "XMLHttpRequest";

declare module "fastify" {
  interface FastifyContextConfig {
    csrfProtection?: boolean;
  }
}

function isCsrfProtectedRoute(request: {
  method: string;
  routeOptions?: {
    config?: {
      csrfProtection?: boolean;
    };
  };
}): boolean {
  if (SAFE_METHODS.has(request.method)) {
    return false;
  }

  return request.routeOptions?.config?.csrfProtection !== false;
}

const securityPluginImpl: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (_request, reply) => {
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "same-origin");

    if (config.NODE_ENV === "production") {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    }
  });

  fastify.addHook("preHandler", async (request) => {
    if (!isCsrfProtectedRoute(request)) {
      return;
    }

    const requestedWith = request.headers[CSRF_HEADER_NAME];
    if (requestedWith === CSRF_HEADER_VALUE) {
      return;
    }

    throw createProblemError(
      403,
      "FORBIDDEN",
      "Forbidden",
      "State-changing requests must include X-Requested-With: XMLHttpRequest."
    );
  });
};

export const securityPlugin = fp(securityPluginImpl, { name: "security" });
export { CSRF_HEADER_NAME, CSRF_HEADER_VALUE };
