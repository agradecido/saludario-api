import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const rateLimitPluginImpl: FastifyPluginAsync = async () => {
  // Implemented in Step 10.
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, { name: "rate-limit" });
