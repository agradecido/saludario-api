import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { config } from "../config/index.js";

const rateLimitPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS
  });
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, { name: "rate-limit" });
