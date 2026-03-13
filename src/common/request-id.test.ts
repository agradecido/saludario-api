import { describe, expect, it } from "vitest";

import { isTrustedRequestId, resolveRequestId } from "./request-id.js";

describe("request id handling", () => {
  it("accepts only trusted incoming request ids", () => {
    expect(isTrustedRequestId("trace-123-abc")).toBe(true);
    expect(isTrustedRequestId("trace\n123")).toBe(false);
    expect(isTrustedRequestId("trace 123")).toBe(false);
  });

  it("falls back to a server-generated request id when the incoming one is invalid", () => {
    const requestId = resolveRequestId({
      headers: {
        "x-request-id": "bad\nvalue"
      }
    } as never);

    expect(requestId).toMatch(/^req_[a-f0-9]{24}$/);
    expect(requestId).not.toBe("bad\nvalue");
  });

  it("reuses a trusted incoming request id", () => {
    const requestId = resolveRequestId({
      headers: {
        "x-request-id": "trace-123"
      }
    } as never);

    expect(requestId).toBe("trace-123");
  });
});
