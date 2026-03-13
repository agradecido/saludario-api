import type { FastifyPluginAsync } from "fastify";

import { requireAuth } from "../auth/auth.hooks.js";
import { buildCategoriesService } from "./categories.service.js";

export const categoriesRoutes: FastifyPluginAsync = async (fastify) => {
  const categoriesService = buildCategoriesService(fastify.prisma);

  fastify.get(
    "",
    {
      preHandler: requireAuth
    },
    async () => {
      return categoriesService.listAll();
    }
  );
};
