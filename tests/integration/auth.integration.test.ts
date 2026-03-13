import { afterEach, describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../../src/config/session.js";
import { createAuthTestApp } from "./helpers/create-auth-test-app.js";

function readSessionCookie(setCookieHeader: string | string[] | undefined): string | null {
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!header) {
    return null;
  }

  const match = header.match(new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`));
  return match?.[1] ?? null;
}

describe("auth routes", () => {
  let app: Awaited<ReturnType<typeof createAuthTestApp>>["app"] | null = null;
  let store: Awaited<ReturnType<typeof createAuthTestApp>>["store"] | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
      store = null;
    }
  });

  it("registers, introspects, and logs out a user", async () => {
    const authTestApp = await createAuthTestApp();
    app = authTestApp.app;
    store = authTestApp.store;

    const registerResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "User@example.com",
        password: "strong-password",
        timezone: "Europe/Madrid"
      }
    });

    expect(registerResponse.statusCode).toBe(201);
    expect(registerResponse.json()).toMatchObject({
      user: {
        email: "user@example.com",
        timezone: "Europe/Madrid"
      }
    });

    const sessionToken = readSessionCookie(registerResponse.headers["set-cookie"]);
    expect(sessionToken).not.toBeNull();
    expect(registerResponse.headers["set-cookie"]).toContain("HttpOnly");
    expect(registerResponse.headers["set-cookie"]).toContain("SameSite=Lax");

    expect(store?.authSessions).toHaveLength(1);
    expect(store?.authSessions[0]?.sessionTokenHash).not.toBe(sessionToken);

    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken!
      }
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      session: {
        expires_at: expect.any(String)
      },
      user: {
        email: "user@example.com",
        timezone: "Europe/Madrid"
      }
    });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken!
      }
    });

    expect(logoutResponse.statusCode).toBe(204);
    expect(logoutResponse.headers["set-cookie"]).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(store?.authSessions[0]?.revokedAt).toBeInstanceOf(Date);

    const afterLogoutSessionResponse = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken!
      }
    });

    expect(afterLogoutSessionResponse.statusCode).toBe(401);
    expect(afterLogoutSessionResponse.json()).toMatchObject({
      title: "Unauthorized",
      status: 401,
      code: "UNAUTHORIZED"
    });
  });

  it("logs in an existing user and exposes the active session", async () => {
    const authTestApp = await createAuthTestApp();
    app = authTestApp.app;

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "user@example.com",
        password: "strong-password",
        timezone: "UTC"
      }
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "user@example.com",
        password: "strong-password"
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json()).toEqual({
      user: {
        id: expect.any(String),
        email: "user@example.com",
        timezone: "UTC"
      }
    });

    const sessionToken = readSessionCookie(loginResponse.headers["set-cookie"]);
    expect(sessionToken).not.toBeNull();

    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken!
      }
    });

    expect(sessionResponse.statusCode).toBe(200);
  });

  it("rejects duplicate registrations with 409", async () => {
    const authTestApp = await createAuthTestApp();
    app = authTestApp.app;

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "user@example.com",
        password: "strong-password",
        timezone: "UTC"
      }
    });

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "user@example.com",
        password: "strong-password",
        timezone: "UTC"
      }
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({
      title: "Conflict",
      status: 409,
      code: "CONFLICT"
    });
  });

  it("rate limits repeated login attempts from the same ip", async () => {
    const authTestApp = await createAuthTestApp();
    app = authTestApp.app;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "missing@example.com",
          password: "wrong-password"
        },
        remoteAddress: "127.0.0.1"
      });

      expect(response.statusCode).toBe(401);
    }

    const limitedResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "missing@example.com",
        password: "wrong-password"
      },
      remoteAddress: "127.0.0.1"
    });

    expect(limitedResponse.statusCode).toBe(429);
    expect(limitedResponse.json()).toMatchObject({
      title: "Too Many Requests",
      status: 429,
      code: "RATE_LIMITED"
    });
  });

  it("keeps logout idempotent when no session is present", async () => {
    const authTestApp = await createAuthTestApp();
    app = authTestApp.app;

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout"
    });

    expect(response.statusCode).toBe(204);
  });
});
