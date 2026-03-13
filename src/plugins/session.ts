import cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { SESSION_COOKIE_NAME } from "../config/session.js";
import { config } from "../config/index.js";

declare module "fastify" {
  interface FastifyRequest {
    sessionToken?: string;
  }
}

const sessionPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cookie, {
    secret: config.SESSION_SECRET,
    hook: "onRequest"
  });

  fastify.addHook("onRequest", async (request) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (typeof token === "string" && token.length > 0) {
      request.sessionToken = token;
    }
  });
};

export const sessionPlugin = fp(sessionPluginImpl, { name: "session" });
