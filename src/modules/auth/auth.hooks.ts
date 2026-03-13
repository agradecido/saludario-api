import type { FastifyReply, FastifyRequest } from "fastify";

import { createProblem } from "../../common/errors.js";

export interface AuthContext {
  sessionId: string | null;
  sessionToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

export function createAnonymousAuthContext(sessionToken: string | null = null): AuthContext {
  return {
    sessionId: null,
    sessionToken,
    userId: null,
    isAuthenticated: false
  };
}

export function setAuthenticatedAuthContext(
  request: FastifyRequest,
  auth: {
    sessionId: string;
    sessionToken: string;
    userId: string;
  }
): void {
  request.auth = {
    sessionId: auth.sessionId,
    sessionToken: auth.sessionToken,
    userId: auth.userId,
    isAuthenticated: true
  };
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.auth.isAuthenticated) {
    return;
  }

  const sessionToken = request.auth.sessionToken ?? request.sessionToken ?? null;
  if (sessionToken) {
    const session = await request.server.sessionManager.validateSession(sessionToken);
    if (session) {
      setAuthenticatedAuthContext(request, {
        sessionId: session.sessionId,
        sessionToken,
        userId: session.userId
      });
      return;
    }
  }

  const problem = createProblem(
    401,
    "UNAUTHORIZED",
    "Unauthorized",
    "Authentication is required to access this resource.",
    {
      instance: request.url,
      request_id: request.id
    }
  );

  return reply.status(401).type("application/problem+json").send(problem);
}
