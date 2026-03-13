import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { config } from "../config/index.js";

const rateLimitPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder(request, context) {
      return {
        statusCode: context.statusCode,
        problemCode: "RATE_LIMITED",
        title: "Too Many Requests",
        detail: `Rate limit exceeded, retry in ${context.after}`,
        extras: {
          instance: request.url,
          request_id: request.id
        }
      };
    }
  });
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, { name: "rate-limit" });
