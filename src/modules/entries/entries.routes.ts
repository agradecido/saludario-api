import type { FastifyPluginAsync } from "fastify";

import { requireAuth } from "../auth/auth.hooks.js";
import { buildEntriesRepository } from "./entries.repository.js";
import { buildEntriesService } from "./entries.service.js";
import {
  createEntryBodySchema,
  entryIdParamsSchema,
  listEntriesQuerySchema,
  updateEntryBodySchema
} from "./entries.schemas.js";

export const entriesRoutes: FastifyPluginAsync = async (fastify) => {
  const entriesRepository = buildEntriesRepository(fastify.prisma);
  const entriesService = buildEntriesService(entriesRepository);

  fastify.post(
    "",
    {
      preHandler: requireAuth,
      schema: {
        body: createEntryBodySchema
      }
    },
    async (request, reply) => {
      const body = createEntryBodySchema.parse(request.body);
      const entry = await entriesService.create(request.auth.userId!, body);

      reply.status(201).send(entry);
    }
  );

  fastify.get(
    "",
    {
      preHandler: requireAuth,
      schema: {
        querystring: listEntriesQuerySchema
      }
    },
    async (request) => {
      const query = listEntriesQuerySchema.parse(request.query);
      return entriesService.list(request.auth.userId!, query);
    }
  );

  fastify.get(
    "/:entry_id",
    {
      preHandler: requireAuth,
      schema: {
        params: entryIdParamsSchema
      }
    },
    async (request) => {
      const { entry_id: entryId } = entryIdParamsSchema.parse(request.params);
      return entriesService.getById(request.auth.userId!, entryId);
    }
  );

  fastify.patch(
    "/:entry_id",
    {
      preHandler: requireAuth,
      schema: {
        params: entryIdParamsSchema,
        body: updateEntryBodySchema
      }
    },
    async (request) => {
      const { entry_id: entryId } = entryIdParamsSchema.parse(request.params);
      const body = updateEntryBodySchema.parse(request.body);

      return entriesService.update(request.auth.userId!, entryId, body);
    }
  );

  fastify.delete(
    "/:entry_id",
    {
      preHandler: requireAuth,
      schema: {
        params: entryIdParamsSchema
      }
    },
    async (request, reply) => {
      const { entry_id: entryId } = entryIdParamsSchema.parse(request.params);
      await entriesService.remove(request.auth.userId!, entryId);
      reply.status(204).send();
    }
  );
};
