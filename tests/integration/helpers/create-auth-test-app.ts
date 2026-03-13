import { createHash, randomUUID } from "node:crypto";

import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import { setAppErrorHandler, zodValidatorCompiler } from "../../../src/app.js";
import { requestIdHook } from "../../../src/common/request-id.js";
import { authRoutes } from "../../../src/modules/auth/auth.routes.js";
import { rateLimitPlugin } from "../../../src/plugins/rate-limit.js";
import { sessionPlugin } from "../../../src/plugins/session.js";

interface TestUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface TestAuthSessionRecord {
  id: string;
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  ipHash: string | null;
  userAgent: string | null;
}

export interface AuthTestStore {
  users: TestUserRecord[];
  authSessions: TestAuthSessionRecord[];
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createPrismaMock(store: AuthTestStore) {
  return {
    user: {
      async findUnique({
        where
      }: {
        where: {
          id?: string;
          email?: string;
        };
      }) {
        if (where.email) {
          return store.users.find((user) => user.email === where.email) ?? null;
        }

        if (where.id) {
          return store.users.find((user) => user.id === where.id) ?? null;
        }

        return null;
      },
      async create({
        data
      }: {
        data: {
          email: string;
          passwordHash: string;
          timezone: string;
        };
      }) {
        const existing = store.users.find((user) => user.email === data.email);
        if (existing) {
          const error = new Error("Unique constraint failed");
          Object.assign(error, {
            code: "P2002",
            name: "PrismaClientKnownRequestError"
          });
          throw error;
        }

        const now = new Date();
        const user: TestUserRecord = {
          id: randomUUID(),
          email: data.email,
          passwordHash: data.passwordHash,
          timezone: data.timezone,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        };

        store.users.push(user);
        return user;
      }
    },
    authSession: {
      async create({
        data
      }: {
        data: {
          userId: string;
          sessionTokenHash: string;
          expiresAt: Date;
          ipHash: string | null;
          userAgent: string | null;
        };
      }) {
        const session: TestAuthSessionRecord = {
          id: randomUUID(),
          userId: data.userId,
          sessionTokenHash: data.sessionTokenHash,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
          revokedAt: null,
          ipHash: data.ipHash,
          userAgent: data.userAgent
        };

        store.authSessions.push(session);
        return session;
      },
      async findFirst({
        where
      }: {
        where: {
          sessionTokenHash: string;
          revokedAt: null;
          expiresAt: {
            gt: Date;
          };
        };
      }) {
        return (
          store.authSessions.find(
            (session) =>
              session.sessionTokenHash === where.sessionTokenHash &&
              session.revokedAt === null &&
              session.expiresAt > where.expiresAt.gt
          ) ?? null
        );
      },
      async updateMany({
        where,
        data
      }: {
        where: {
          sessionTokenHash: string;
          revokedAt: null;
        };
        data: {
          revokedAt: Date;
        };
      }) {
        let count = 0;

        for (const session of store.authSessions) {
          if (session.sessionTokenHash === where.sessionTokenHash && session.revokedAt === null) {
            session.revokedAt = data.revokedAt;
            count += 1;
          }
        }

        return { count };
      }
    },
    hashValue
  };
}

export async function createAuthTestApp(): Promise<{
  app: FastifyInstance;
  store: AuthTestStore;
}> {
  const store: AuthTestStore = {
    users: [],
    authSessions: []
  };
  const prisma = createPrismaMock(store);

  const app = Fastify({ logger: false });
  app.setValidatorCompiler(zodValidatorCompiler);
  app.addHook("onRequest", requestIdHook);
  app.decorate("prisma", prisma as never);
  setAppErrorHandler(app);

  await app.register(sessionPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  return { app, store };
}
