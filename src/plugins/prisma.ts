import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const prismaPluginImpl: FastifyPluginAsync = async () => {
  // Implemented in Step 8.
};

export const prismaPlugin = fp(prismaPluginImpl, { name: "prisma" });
