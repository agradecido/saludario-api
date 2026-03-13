import { Prisma } from "@prisma/client";

import { createProblemError } from "../../common/errors.js";
import type { SessionManager } from "../../plugins/session.js";
import type { UsersRepository } from "../users/users.repository.js";
import { hashPassword, verifyPassword } from "./password.js";

export interface AuthRequestMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  timezone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  timezone: string;
  created_at: string;
}

export interface SessionUserSummary {
  id: string;
  email: string;
  timezone: string;
}

export interface AuthSessionSummary {
  expires_at: string;
}

export interface RegisterResult {
  user: AuthenticatedUser;
  sessionToken: string;
}

export interface LoginResult {
  user: SessionUserSummary;
  sessionToken: string;
}

export interface SessionResult {
  session: AuthSessionSummary;
  user: SessionUserSummary;
}

export interface AuthService {
  register(input: RegisterInput, metadata?: AuthRequestMetadata): Promise<RegisterResult>;
  login(input: LoginInput, metadata?: AuthRequestMetadata): Promise<LoginResult>;
  logout(sessionToken?: string | null): Promise<void>;
  getSession(sessionToken: string): Promise<SessionResult>;
}

export interface AuthServiceDependencies {
  usersRepository: UsersRepository;
  sessionManager: SessionManager;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  timezone: string;
  createdAt: Date;
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone,
    created_at: user.createdAt.toISOString()
  };
}

function toSessionUserSummary(user: {
  id: string;
  email: string;
  timezone: string;
}): SessionUserSummary {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone
  };
}

export function buildAuthService({
  usersRepository,
  sessionManager
}: AuthServiceDependencies): AuthService {
  return {
    async register(input, metadata) {
      const existingUser = await usersRepository.findByEmail(input.email);
      if (existingUser) {
        throw createProblemError(
          409,
          "CONFLICT",
          "Conflict",
          "An account with this email already exists."
        );
      }

      const passwordHash = await hashPassword(input.password);

      let user;
      try {
        user = await usersRepository.create({
          email: input.email,
          passwordHash,
          timezone: input.timezone
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw createProblemError(
            409,
            "CONFLICT",
            "Conflict",
            "An account with this email already exists."
          );
        }

        throw error;
      }

      const session = await sessionManager.createSession({
        userId: user.id,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });

      return {
        user: toAuthenticatedUser(user),
        sessionToken: session.sessionToken
      };
    },

    async login(input, metadata) {
      const user = await usersRepository.findByEmail(input.email);
      if (!user) {
        throw createProblemError(
          401,
          "UNAUTHORIZED",
          "Unauthorized",
          "Invalid email or password."
        );
      }

      const isValid = await verifyPassword(user.passwordHash, input.password);
      if (!isValid) {
        throw createProblemError(
          401,
          "UNAUTHORIZED",
          "Unauthorized",
          "Invalid email or password."
        );
      }

      const session = await sessionManager.createSession({
        userId: user.id,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });

      return {
        user: toSessionUserSummary(user),
        sessionToken: session.sessionToken
      };
    },

    async logout(sessionToken) {
      if (!sessionToken) {
        return;
      }

      await sessionManager.revokeSession(sessionToken);
    },

    async getSession(sessionToken) {
      const session = await sessionManager.validateSession(sessionToken);
      if (!session) {
        throw createProblemError(
          401,
          "UNAUTHORIZED",
          "Unauthorized",
          "Authentication is required to access this resource."
        );
      }

      const user = await usersRepository.findById(session.userId);
      if (!user) {
        throw createProblemError(
          401,
          "UNAUTHORIZED",
          "Unauthorized",
          "Authentication is required to access this resource."
        );
      }

      return {
        session: {
          expires_at: session.expiresAt.toISOString()
        },
        user: toSessionUserSummary(user)
      };
    }
  };
}
