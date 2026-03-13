import cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

import { SESSION_COOKIE_NAME } from "../config/session.js";
import { config } from "../config/index.js";
import {
  createAnonymousAuthContext,
  type AuthContext
} from "../modules/auth/auth.hooks.js";

declare module "fastify" {
  interface FastifyRequest {
    sessionToken?: string;
    auth: AuthContext;
  }
}

const sessionPluginImpl: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cookie, {
    secret: config.SESSION_SECRET,
    hook: "onRequest"
  });

  fastify.addHook("onRequest", async (request) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    const sessionToken = typeof token === "string" && token.length > 0 ? token : null;

    request.sessionToken = sessionToken ?? undefined;
    request.auth = createAnonymousAuthContext(sessionToken);
  });
};

export const sessionPlugin = fp(sessionPluginImpl, { name: "session" });
