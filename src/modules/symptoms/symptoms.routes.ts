import type { FastifyPluginAsync } from "fastify";

import { requireAuth } from "../auth/auth.hooks.js";
import { buildSymptomsRepository } from "./symptoms.repository.js";
import { buildSymptomsService } from "./symptoms.service.js";
import {
  createSymptomBodySchema,
  listSymptomsQuerySchema,
  symptomEventIdParamsSchema
} from "./symptoms.schemas.js";

export const symptomsRoutes: FastifyPluginAsync = async (fastify) => {
  const symptomsRepository = buildSymptomsRepository(fastify.prisma);
  const symptomsService = buildSymptomsService(symptomsRepository);

  fastify.post(
    "/events",
    {
      preHandler: requireAuth,
      schema: {
        body: createSymptomBodySchema
      }
    },
    async (request, reply) => {
      const body = createSymptomBodySchema.parse(request.body);
      const event = await symptomsService.create(request.auth.userId!, body);
      reply.status(201).send(event);
    }
  );

  fastify.get(
    "/events",
    {
      preHandler: requireAuth,
      schema: {
        querystring: listSymptomsQuerySchema
      }
    },
    async (request) => {
      const query = listSymptomsQuerySchema.parse(request.query);
      return symptomsService.list(request.auth.userId!, query);
    }
  );

  fastify.get(
    "/events/:symptom_event_id",
    {
      preHandler: requireAuth,
      schema: {
        params: symptomEventIdParamsSchema
      }
    },
    async (request) => {
      const { symptom_event_id: symptomEventId } = symptomEventIdParamsSchema.parse(request.params);
      return symptomsService.getById(request.auth.userId!, symptomEventId);
    }
  );
};
