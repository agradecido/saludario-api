import Fastify, { type FastifyRequest } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../config/session.js";
import {
  createSessionToken,
  getSessionExpiration,
  hashIpAddress,
  hashSessionToken,
  sessionPlugin
} from "./session.js";

describe("session helpers", () => {
  it("creates 32-byte hex session tokens", () => {
    const token = createSessionToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashes session tokens and ip addresses with sha256", () => {
    expect(hashSessionToken("token-123")).toHaveLength(64);
    expect(hashIpAddress("127.0.0.1")).toHaveLength(64);
    expect(hashSessionToken("token-123")).not.toBe("token-123");
  });

  it("computes the session expiration from config", () => {
    const now = new Date("2026-03-13T00:00:00.000Z");
    const expiration = getSessionExpiration(now);

    expect(expiration.toISOString()).toBe("2026-03-20T00:00:00.000Z");
  });
});

describe("session plugin", () => {
  let app: ReturnType<typeof Fastify> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("creates sessions using a hashed token and hashed ip address", async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "session-1",
      userId: data.userId as string,
      expiresAt: data.expiresAt as Date
    }));

    app = Fastify();
    app.decorate("prisma", {
      authSession: {
        create,
        findFirst: vi.fn(),
        updateMany: vi.fn()
      }
    });

    await app.register(sessionPlugin);

    const result = await app.sessionManager.createSession({
      userId: "user-1",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest Agent"
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.userId).toBe("user-1");
    expect(result.sessionToken).toMatch(/^[a-f0-9]{64}$/);

    const createCall = create.mock.calls[0]?.[0];
    expect(createCall).toBeDefined();

    const { data } = createCall as { data: Record<string, unknown> };
    expect(data.sessionTokenHash).toBe(hashSessionToken(result.sessionToken));
    expect(data.sessionTokenHash).not.toBe(result.sessionToken);
    expect(data.ipHash).toBe(hashIpAddress("127.0.0.1"));
    expect(data.userAgent).toBe("Vitest Agent");
  });

  it("validates and revokes sessions by hashed token", async () => {
    const findFirst = vi.fn(async () => ({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date("2026-03-20T00:00:00.000Z")
    }));
    const updateMany = vi.fn(async () => ({ count: 1 }));

    app = Fastify();
    app.decorate("prisma", {
      authSession: {
        create: vi.fn(),
        findFirst,
        updateMany
      }
    });

    await app.register(sessionPlugin);

    const actor = await app.sessionManager.validateSession("token-123");
    await app.sessionManager.revokeSession("token-123");

    expect(actor).toMatchObject({
      sessionId: "session-1",
      userId: "user-1"
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionTokenHash: hashSessionToken("token-123")
        })
      })
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionTokenHash: hashSessionToken("token-123")
        })
      })
    );
  });

  it("bootstraps request auth context from the session cookie", async () => {
    app = Fastify();
    app.decorate("prisma", {
      authSession: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn()
      }
    });

    await app.register(sessionPlugin);

    app.get("/session-bootstrap", async (request: FastifyRequest) => ({
      sessionToken: request.sessionToken ?? null,
      auth: request.auth
    }));

    const response = await app.inject({
      method: "GET",
      url: "/session-bootstrap",
      cookies: {
        [SESSION_COOKIE_NAME]: "token-abc"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      sessionToken: "token-abc",
      auth: {
        sessionId: null,
        sessionToken: "token-abc",
        userId: null,
        isAuthenticated: false
      }
    });
  });
});
