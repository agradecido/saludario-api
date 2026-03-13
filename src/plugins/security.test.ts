import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { setAppErrorHandler } from "../app.js";
import { securityPlugin, CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "./security.js";

describe("security plugin", () => {
  let app: ReturnType<typeof Fastify> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("adds security headers to responses", async () => {
    app = Fastify();
    setAppErrorHandler(app);
    await app.register(securityPlugin);

    app.get("/health", async () => ({ status: "ok" }));

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("same-origin");
  });

  it("rejects state-changing requests without the csrf header", async () => {
    app = Fastify();
    setAppErrorHandler(app);
    await app.register(securityPlugin);

    app.post("/mutate", async () => ({ ok: true }));

    const response = await app.inject({
      method: "POST",
      url: "/mutate"
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      title: "Forbidden",
      status: 403,
      code: "FORBIDDEN"
    });
  });

  it("allows state-changing requests with the csrf header", async () => {
    app = Fastify();
    setAppErrorHandler(app);
    await app.register(securityPlugin);

    app.post("/mutate", async () => ({ ok: true }));

    const response = await app.inject({
      method: "POST",
      url: "/mutate",
      headers: {
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
