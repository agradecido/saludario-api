import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import {
  createAnonymousAuthContext,
  requireAuth,
  setAuthenticatedAuthContext
} from "./auth.hooks.js";
import {
  PASSWORD_MIN_LENGTH,
  hashPassword,
  isPasswordLongEnough,
  verifyPassword
} from "./password.js";

describe("auth hooks", () => {
  let app: ReturnType<typeof Fastify> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("returns 401 problem details when auth is required and request is anonymous", async () => {
    app = Fastify();

    app.get(
      "/protected",
      {
        preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
          request.auth = createAnonymousAuthContext();
          await requireAuth(request, reply);
        }
      },
      async () => ({ ok: true })
    );

    const response = await app.inject({
      method: "GET",
      url: "/protected"
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json()).toMatchObject({
      title: "Unauthorized",
      status: 401,
      code: "UNAUTHORIZED"
    });
  });

  it("allows authenticated requests to continue", async () => {
    app = Fastify();

    app.get(
      "/protected",
      {
        preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
          request.auth = createAnonymousAuthContext("token-123");
          setAuthenticatedAuthContext(request, {
            sessionId: "session-1",
            sessionToken: "token-123",
            userId: "user-1"
          });
          await requireAuth(request, reply);
        }
      },
      async () => ({ ok: true })
    );

    const response = await app.inject({
      method: "GET",
      url: "/protected"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});

describe("password helpers", () => {
  it("enforces minimum password length", async () => {
    const shortPassword = "x".repeat(PASSWORD_MIN_LENGTH - 1);

    expect(isPasswordLongEnough(shortPassword)).toBe(false);
    await expect(hashPassword(shortPassword)).rejects.toThrow(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
    );
  });

  it("hashes with argon2id and verifies valid passwords", async () => {
    const password = "x".repeat(PASSWORD_MIN_LENGTH);
    const hash = await hashPassword(password);

    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, `${password}!`)).resolves.toBe(false);
  });
});
