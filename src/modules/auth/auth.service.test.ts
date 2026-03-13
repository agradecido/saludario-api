import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { SessionManager } from "../../plugins/session.js";
import type { UsersRepository } from "../users/users.repository.js";
import * as passwordModule from "./password.js";
import { PASSWORD_MIN_LENGTH, hashPassword } from "./password.js";
import { buildAuthService } from "./auth.service.js";

function createUsersRepository(): UsersRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn()
  };
}

function createSessionManager(): SessionManager {
  return {
    createSession: vi.fn(),
    validateSession: vi.fn(),
    revokeSession: vi.fn(),
    setSessionCookie: vi.fn(),
    clearSessionCookie: vi.fn()
  };
}

describe("auth service", () => {
  it("registers a user and creates a session", async () => {
    const usersRepository = createUsersRepository();
    const sessionManager = createSessionManager();

    vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(usersRepository.create).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      timezone: "Europe/Madrid",
      createdAt: new Date("2026-03-13T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      deletedAt: null
    });
    vi.mocked(sessionManager.createSession).mockResolvedValue({
      sessionId: "session-1",
      userId: "user-1",
      expiresAt: new Date("2026-03-20T00:00:00.000Z"),
      sessionToken: "token-123"
    });

    const service = buildAuthService({
      usersRepository,
      sessionManager
    });

    const result = await service.register({
      email: "user@example.com",
      password: "x".repeat(PASSWORD_MIN_LENGTH),
      timezone: "Europe/Madrid"
    });

    expect(result).toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        timezone: "Europe/Madrid",
        created_at: "2026-03-13T00:00:00.000Z"
      },
      sessionToken: "token-123"
    });
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: "user@example.com",
      passwordHash: expect.stringMatching(/^\$argon2id\$/),
      timezone: "Europe/Madrid"
    });
    expect(sessionManager.createSession).toHaveBeenCalledWith({
      userId: "user-1",
      ipAddress: undefined,
      userAgent: undefined
    });
  });

  it("rejects duplicate registrations", async () => {
    const passwordHash = await hashPassword("x".repeat(PASSWORD_MIN_LENGTH));
    const usersRepository = createUsersRepository();
    const sessionManager = createSessionManager();

    vi.mocked(usersRepository.findByEmail).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash,
      timezone: "UTC",
      createdAt: new Date("2026-03-13T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      deletedAt: null
    });

    const service = buildAuthService({
      usersRepository,
      sessionManager
    });

    await expect(
      service.register({
        email: "user@example.com",
        password: "x".repeat(PASSWORD_MIN_LENGTH),
        timezone: "UTC"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      problemCode: "CONFLICT"
    });
  });

  it("maps prisma unique constraint errors to conflicts", async () => {
    const usersRepository = createUsersRepository();
    const sessionManager = createSessionManager();

    vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(usersRepository.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.2"
      })
    );

    const service = buildAuthService({
      usersRepository,
      sessionManager
    });

    await expect(
      service.register({
        email: "user@example.com",
        password: "x".repeat(PASSWORD_MIN_LENGTH),
        timezone: "UTC"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      problemCode: "CONFLICT"
    });
  });

  it("rejects invalid login credentials", async () => {
    const usersRepository = createUsersRepository();
    const sessionManager = createSessionManager();

    vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);

    const service = buildAuthService({
      usersRepository,
      sessionManager
    });

    await expect(
      service.login({
        email: "user@example.com",
        password: "wrong-password"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      problemCode: "UNAUTHORIZED"
    });
  });

  it("burns password verification work when the email does not exist", async () => {
    const usersRepository = createUsersRepository();
    const sessionManager = createSessionManager();
    const verifyPasswordSpy = vi.spyOn(passwordModule, "verifyPassword");

    vi.mocked(usersRepository.findByEmail).mockResolvedValue(null);

    const service = buildAuthService({
      usersRepository,
      sessionManager
    });

    await expect(
      service.login({
        email: "missing@example.com",
        password: "wrong-password"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      problemCode: "UNAUTHORIZED"
    });

    expect(verifyPasswordSpy).toHaveBeenCalledTimes(1);
  });

  it("returns session introspection data for a valid session", async () => {
    const usersRepository = createUsersRepository();
    const sessionManager = createSessionManager();

    vi.mocked(sessionManager.validateSession).mockResolvedValue({
      sessionId: "session-1",
      userId: "user-1",
      expiresAt: new Date("2026-03-20T00:00:00.000Z")
    });
    vi.mocked(usersRepository.findById).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      timezone: "UTC",
      createdAt: new Date("2026-03-13T00:00:00.000Z"),
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
      deletedAt: null
    });

    const service = buildAuthService({
      usersRepository,
      sessionManager
    });

    await expect(service.getSession("token-123")).resolves.toEqual({
      session: {
        expires_at: "2026-03-20T00:00:00.000Z"
      },
      user: {
        id: "user-1",
        email: "user@example.com",
        timezone: "UTC"
      }
    });
  });
});
