import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{1,100}$/;

function nextRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}

export function isTrustedRequestId(value: string): boolean {
  return REQUEST_ID_PATTERN.test(value);
}

export function resolveRequestId(request: FastifyRequest): string {
  const incoming = request.headers["x-request-id"];
  if (typeof incoming === "string" && isTrustedRequestId(incoming)) {
    return incoming;
  }

  return nextRequestId();
}

export async function requestIdHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const requestId = resolveRequestId(request);
  reply.header("x-request-id", requestId);
}
