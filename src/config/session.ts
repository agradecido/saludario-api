import { config } from "./index.js";

export const SESSION_COOKIE_NAME = "saludario_session";

export const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: config.SESSION_MAX_AGE_SECONDS
};
