import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const WEAK_SESSION_SECRET_PATTERNS = [
  /^replace_with/i,
  /^(0123456789abcdef)+$/i,
  /^(.)\1+$/i
];

export function isWeakSessionSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase();
  return WEAK_SESSION_SECRET_PATTERNS.some((pattern) => pattern.test(normalized));
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(604800),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

if (parsed.data.NODE_ENV === "production" && isWeakSessionSecret(parsed.data.SESSION_SECRET)) {
  throw new Error("SESSION_SECRET is too weak for production.");
}

export type AppConfig = z.infer<typeof envSchema>;
export const config: AppConfig = parsed.data;
