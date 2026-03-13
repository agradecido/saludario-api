import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const sessionPluginImpl: FastifyPluginAsync = async () => {
  // Implemented in Step 9.
};

export const sessionPlugin = fp(sessionPluginImpl, { name: "session" });
