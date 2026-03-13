import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

function nextRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}

export function resolveRequestId(request: FastifyRequest): string {
  const incoming = request.headers["x-request-id"];
  if (typeof incoming === "string" && incoming.length > 0) {
    return incoming;
  }

  return nextRequestId();
}

export async function requestIdHook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const requestId = resolveRequestId(request);
  reply.header("x-request-id", requestId);
}
