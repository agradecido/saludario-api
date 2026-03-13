import { createHash, randomBytes } from "node:crypto";

import cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../config/session.js";
import { config } from "../config/index.js";
import {
  createAnonymousAuthContext,
  type AuthContext
} from "../modules/auth/auth.hooks.js";

export interface SessionActor {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SessionManager {
  createSession(input: CreateSessionInput): Promise<SessionActor & { sessionToken: string }>;
  validateSession(sessionToken: string): Promise<SessionActor | null>;
  revokeSession(sessionToken: string): Promise<void>;
  setSessionCookie(reply: FastifyReply, sessionToken: string): void;
  clearSessionCookie(reply: FastifyReply): void;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken).digest("hex");
}

export function hashIpAddress(ipAddress: string): string {
  return createHash("sha256").update(ipAddress).digest("hex");
}

export function getSessionExpiration(now: Date = new Date()): Date {
  return new Date(now.getTime() + config.SESSION_MAX_AGE_SECONDS * 1000);
}

function normalizeUserAgent(userAgent?: string | null): string | null {
  if (typeof userAgent !== "string") {
    return null;
  }

  const trimmed = userAgent.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, 1024);
}

declare module "fastify" {
  interface FastifyRequest {
    sessionToken?: string;
    auth: AuthContext;
  }

  interface FastifyInstance {
    sessionManager: SessionManager;
  }
}

const sessionPluginImpl: FastifyPluginAsync = async (fastify) => {
  const sessionManager: SessionManager = {
    async createSession(input) {
      const sessionToken = createSessionToken();
      const sessionTokenHash = hashSessionToken(sessionToken);
      const expiresAt = getSessionExpiration();
      const ipHash =
        typeof input.ipAddress === "string" && input.ipAddress.length > 0
          ? hashIpAddress(input.ipAddress)
          : null;

      const session = await fastify.prisma.authSession.create({
        data: {
          userId: input.userId,
          sessionTokenHash,
          expiresAt,
          ipHash,
          userAgent: normalizeUserAgent(input.userAgent)
        }
      });

      return {
        sessionId: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        sessionToken
      };
    },

    async validateSession(sessionToken) {
      const sessionTokenHash = hashSessionToken(sessionToken);
      const session = await fastify.prisma.authSession.findFirst({
        where: {
          sessionTokenHash,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!session) {
        return null;
      }

      return {
        sessionId: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt
      };
    },

    async revokeSession(sessionToken) {
      const sessionTokenHash = hashSessionToken(sessionToken);

      await fastify.prisma.authSession.updateMany({
        where: {
          sessionTokenHash,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    },

    setSessionCookie(reply, sessionToken) {
      reply.setCookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    },

    clearSessionCookie(reply) {
      reply.clearCookie(SESSION_COOKIE_NAME, {
        path: sessionCookieOptions.path,
        httpOnly: sessionCookieOptions.httpOnly,
        secure: sessionCookieOptions.secure,
        sameSite: sessionCookieOptions.sameSite
      });
    }
  };

  fastify.decorate("sessionManager", sessionManager);

  await fastify.register(cookie, {
    secret: config.SESSION_SECRET,
    hook: "onRequest"
  });

  fastify.addHook("onRequest", async (request) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    const sessionToken = typeof token === "string" && token.length > 0 ? token : null;

    request.sessionToken = sessionToken ?? undefined;
    request.auth = createAnonymousAuthContext(sessionToken);
  });
};

export const sessionPlugin = fp(sessionPluginImpl, { name: "session" });
