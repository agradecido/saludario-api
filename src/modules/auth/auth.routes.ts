import type { FastifyPluginAsync } from "fastify";

import { requireAuth } from "./auth.hooks.js";
import { buildAuthService } from "./auth.service.js";
import { loginBodySchema, registerBodySchema } from "./auth.schemas.js";
import { buildUsersRepository } from "../users/users.repository.js";

function getRequestMetadata(request: {
  ip: string;
  headers: Record<string, unknown>;
}) {
  return {
    ipAddress: request.ip,
    userAgent:
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null
  };
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const usersRepository = buildUsersRepository(fastify.prisma);
  const authService = buildAuthService({
    usersRepository,
    sessionManager: fastify.sessionManager
  });

  fastify.post(
    "/register",
    {
      schema: {
        body: registerBodySchema
      }
    },
    async (request, reply) => {
      const body = registerBodySchema.parse(request.body);
      const result = await authService.register(body, getRequestMetadata(request));

      fastify.sessionManager.setSessionCookie(reply, result.sessionToken);

      reply.status(201).send({
        user: result.user
      });
    }
  );

  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 60_000
        }
      },
      schema: {
        body: loginBodySchema
      }
    },
    async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const result = await authService.login(body, getRequestMetadata(request));

      fastify.sessionManager.setSessionCookie(reply, result.sessionToken);

      reply.send({
        user: result.user
      });
    }
  );

  fastify.post("/logout", async (request, reply) => {
    await authService.logout(request.sessionToken ?? null);
    fastify.sessionManager.clearSessionCookie(reply);
    reply.status(204).send();
  });

  fastify.get(
    "/session",
    {
      preHandler: requireAuth
    },
    async (request) => {
      const sessionToken = request.auth.sessionToken;
      const result = await authService.getSession(sessionToken!);

      return result;
    }
  );
};
