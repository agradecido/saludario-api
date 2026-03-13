import { z } from "zod";

import { PASSWORD_MIN_LENGTH } from "./password.js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const normalizedEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Email must be valid")
  .transform(normalizeEmail);

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);

const timezoneSchema = z.string().trim().min(1).default("UTC");

export const registerBodySchema = z
  .object({
    email: normalizedEmailSchema,
    password: passwordSchema,
    timezone: timezoneSchema.optional().default("UTC")
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: normalizedEmailSchema,
    password: z.string().min(1, "Password is required")
  })
  .strict();

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
