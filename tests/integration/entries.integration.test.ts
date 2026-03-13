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

describe("entries routes", () => {
  let app: Awaited<ReturnType<typeof createAuthTestApp>>["app"] | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("lists categories for authenticated users", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "categories@example.com");

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/categories",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [
        { code: "breakfast", label: "Breakfast", sort_order: 1 },
        { code: "lunch", label: "Lunch", sort_order: 2 },
        { code: "dinner", label: "Dinner", sort_order: 3 },
        { code: "snack", label: "Snack", sort_order: 4 }
      ]
    });
  });

  it("supports the full CRUD cycle for a user entry", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "crud@example.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/entries",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      },
      payload: {
        meal_category_code: "lunch",
        food_name: "Grilled chicken",
        quantity_value: 200,
        quantity_unit: "g",
        notes: "Homemade",
        consumed_at: "2026-03-13T12:00:00.000Z"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const createdEntry = createResponse.json();
    expect(createdEntry).toMatchObject({
      meal_category_code: "lunch",
      food_name: "Grilled chicken",
      quantity_value: 200,
      quantity_unit: "g",
      notes: "Homemade"
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/api/v1/entries/${createdEntry.id}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      id: createdEntry.id,
      meal_category_code: "lunch"
    });

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/v1/entries/${createdEntry.id}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      },
      payload: {
        notes: "Updated notes",
        consumed_at: "2026-03-13T12:45:00.000Z"
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      id: createdEntry.id,
      notes: "Updated notes",
      consumed_at: "2026-03-13T12:45:00.000Z"
    });

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/v1/entries/${createdEntry.id}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(deleteResponse.statusCode).toBe(204);

    const notFoundResponse = await app.inject({
      method: "GET",
      url: `/api/v1/entries/${createdEntry.id}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(notFoundResponse.statusCode).toBe(404);
    expect(notFoundResponse.json()).toMatchObject({
      code: "NOT_FOUND",
      status: 404
    });
  });

  it("paginates and filters entry history", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "listing@example.com");

    for (let index = 0; index < 25; index += 1) {
      const consumedAt = new Date(Date.UTC(2026, 2, 13, 12, 0, 0) - index * 60_000).toISOString();
      await app.inject({
        method: "POST",
        url: "/api/v1/entries",
        cookies: {
          [SESSION_COOKIE_NAME]: sessionToken
        },
        payload: {
          meal_category_code: index % 2 === 0 ? "lunch" : "snack",
          food_name: `Entry ${index + 1}`,
          consumed_at: consumedAt
        }
      });
    }

    const firstPageResponse = await app.inject({
      method: "GET",
      url: "/api/v1/entries?limit=20",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(firstPageResponse.statusCode).toBe(200);
    const firstPage = firstPageResponse.json();
    expect(firstPage.data).toHaveLength(20);
    expect(firstPage.page).toEqual({
      limit: 20,
      has_more: true,
      next_cursor: expect.any(String)
    });

    const secondPageResponse = await app.inject({
      method: "GET",
      url: `/api/v1/entries?limit=20&cursor=${encodeURIComponent(firstPage.page.next_cursor)}`,
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(secondPageResponse.statusCode).toBe(200);
    expect(secondPageResponse.json()).toMatchObject({
      data: expect.any(Array),
      page: {
        limit: 20,
        has_more: false,
        next_cursor: null
      }
    });
    expect(secondPageResponse.json().data).toHaveLength(5);

    const categoryFilterResponse = await app.inject({
      method: "GET",
      url: "/api/v1/entries?meal_category_code=snack&limit=100",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(categoryFilterResponse.statusCode).toBe(200);
    expect(categoryFilterResponse.json().data).toHaveLength(12);

    const dateFilterResponse = await app.inject({
      method: "GET",
      url:
        "/api/v1/entries?from=2026-03-13T11:50:00.000Z&to=2026-03-13T12:00:00.000Z&limit=100",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      }
    });

    expect(dateFilterResponse.statusCode).toBe(200);
    expect(dateFilterResponse.json().data).toHaveLength(11);
  });

  it("returns 404 for cross-user entry access", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;

    const userASession = await registerUser(app, "user-a@example.com");
    const userBSession = await registerUser(app, "user-b@example.com");

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/v1/entries",
      cookies: {
        [SESSION_COOKIE_NAME]: userASession
      },
      payload: {
        meal_category_code: "dinner",
        food_name: "Private dinner",
        consumed_at: "2026-03-13T19:00:00.000Z"
      }
    });

    const entryId = createResponse.json().id;

    for (const request of [
      app.inject({
        method: "GET",
        url: `/api/v1/entries/${entryId}`,
        cookies: {
          [SESSION_COOKIE_NAME]: userBSession
        }
      }),
      app.inject({
        method: "PATCH",
        url: `/api/v1/entries/${entryId}`,
        cookies: {
          [SESSION_COOKIE_NAME]: userBSession
        },
        payload: {
          notes: "Should not work"
        }
      }),
      app.inject({
        method: "DELETE",
        url: `/api/v1/entries/${entryId}`,
        cookies: {
          [SESSION_COOKIE_NAME]: userBSession
        }
      })
    ]) {
      const response = await request;
      expect(response.statusCode).toBe(404);
    }
  });

  it("rejects invalid payloads and anonymous requests", async () => {
    const apiTestApp = await createAuthTestApp();
    app = apiTestApp.app;
    const sessionToken = await registerUser(app, "validation@example.com");

    const invalidCategoryResponse = await app.inject({
      method: "POST",
      url: "/api/v1/entries",
      cookies: {
        [SESSION_COOKIE_NAME]: sessionToken
      },
      payload: {
        meal_category_code: "invalid-category",
        food_name: "Soup",
        consumed_at: "2026-03-13T10:00:00.000Z"
      }
    });

    expect(invalidCategoryResponse.statusCode).toBe(400);
    expect(invalidCategoryResponse.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400
    });

    const anonymousResponse = await app.inject({
      method: "GET",
      url: "/api/v1/entries"
    });

    expect(anonymousResponse.statusCode).toBe(401);
    expect(anonymousResponse.json()).toMatchObject({
      code: "UNAUTHORIZED",
      status: 401
    });
  });
});
