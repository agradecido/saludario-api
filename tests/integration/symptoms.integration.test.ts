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

async function registerUser(
  app: Awaited<ReturnType<typeof createAuthTestApp>>["app"],
  email: string
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      email,
      password: "strong-password",
      timezone: "UTC"
    }
  });

  const sessionToken = readSessionCookie(response.headers["set-cookie"]);
  if (!sessionToken) {
    throw new Error("Expected session cookie after registration");
  }

  return sessionToken;
}

describe("symptom routes", () => {
  let app: Awaited<ReturnType<typeof createAuthTestApp>>["app"] | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("creates, lists, and gets symptom events", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "symptoms@example.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/internal/symptoms/events",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      },
      payload: {
        symptom_code: "bloating",
        severity: 3,
        occurred_at: "2026-03-13T18:30:00.000Z",
        notes: "Started after dinner"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const createdEvent = createResponse.json();
    expect(createdEvent).toMatchObject({
      symptom_code: "bloating",
      severity: 3,
      notes: "Started after dinner"
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/v1/internal/symptoms/events",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      data: [expect.objectContaining({ id: createdEvent.id, symptom_code: "bloating" })],
      page: {
        limit: 20,
        has_more: false,
        next_cursor: null
      }
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/internal/symptoms/events/${createdEvent.id}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      id: createdEvent.id,
      symptom_code: "bloating",
      severity: 3
    });
  });

  it("paginates and filters symptom events", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "symptoms-list@example.com");

    for (let index = 0; index < 25; index += 1) {
      const occurredAt = new Date(Date.UTC(2026, 2, 13, 20, 0, 0) - index * 60_000).toISOString();
      await app.inject({
        method: "POST",
        url: "/api/v1/internal/symptoms/events",
        cookies: {
          [SESSION_COOKIE_NAME]: sessionToken
        },
        payload: {
          symptom_code: index % 2 === 0 ? "bloating" : "headache",
          severity: (index % 5) + 1,
          occurred_at: occurredAt
        }
      });
    }

    const firstPageResponse = await app.inject({
      method: "GET",
      url: "/api/v1/internal/symptoms/events?limit=20",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(firstPageResponse.statusCode).toBe(200);
    const firstPage = firstPageResponse.json();
    expect(firstPage.data).toHaveLength(20);
    expect(firstPage.page.has_more).toBe(true);
    expect(firstPage.page.next_cursor).toEqual(expect.any(String));

    const secondPageResponse = await app.inject({
      method: "GET",
      url: `/api/v1/internal/symptoms/events?limit=20&cursor=${encodeURIComponent(firstPage.page.next_cursor)}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(secondPageResponse.statusCode).toBe(200);
    expect(secondPageResponse.json().data).toHaveLength(5);
    expect(secondPageResponse.json().page).toEqual({
      limit: 20,
      has_more: false,
      next_cursor: null
    });

    const symptomCodeFilterResponse = await app.inject({
      method: "GET",
      url: "/api/v1/internal/symptoms/events?symptom_code=headache&limit=100",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(symptomCodeFilterResponse.statusCode).toBe(200);
    expect(symptomCodeFilterResponse.json().data).toHaveLength(12);

    const dateFilterResponse = await app.inject({
      method: "GET",
      url:
        "/api/v1/internal/symptoms/events?from=2026-03-13T19:50:00.000Z&to=2026-03-13T20:00:00.000Z&limit=100",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(dateFilterResponse.statusCode).toBe(200);
    expect(dateFilterResponse.json().data).toHaveLength(11);
  });

  it("enforces ownership isolation across users", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;

    const userASession = await registerUser(app, "symptom-a@example.com");
    const userBSession = await registerUser(app, "symptom-b@example.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/internal/symptoms/events",
      cookies: {
        [SESSION_COOKIE_NAME]: userASession
      },
      payload: {
        symptom_code: "bloating",
        severity: 4,
        occurred_at: "2026-03-13T18:30:00.000Z"
      }
    });

    const eventId = createResponse.json().id;

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/internal/symptoms/events/${eventId}`,
      cookies: {
        [SESSION_COOKIE_NAME]: userBSession
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: "NOT_FOUND",
      status: 404
    });
  });

  it("rejects invalid severity values and anonymous access", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "symptom-validation@example.com");

    const invalidSeverityResponse = await app.inject({
      method: "POST",
      url: "/api/v1/internal/symptoms/events",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      },
      payload: {
        symptom_code: "bloating",
        severity: 6,
        occurred_at: "2026-03-13T18:30:00.000Z"
      }
    });

    expect(invalidSeverityResponse.statusCode).toBe(400);
    expect(invalidSeverityResponse.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    });

    const anonymousResponse = await app.inject({
      method: "GET",
      url: "/api/v1/internal/symptoms/events"
    });

    expect(anonymousResponse.statusCode).toBe(401);
    expect(anonymousResponse.json()).toMatchObject({
      code: "UNAUTHORIZED",
      status: 401
    });
  });
});
