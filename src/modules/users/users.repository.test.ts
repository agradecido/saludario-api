import type { User } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { buildUsersRepository } from "./users.repository.js";

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hashed-password",
    timezone: "UTC",
    createdAt: new Date("2026-03-13T00:00:00.000Z"),
    updatedAt: new Date("2026-03-13T00:00:00.000Z"),
    deletedAt: null,
    ...overrides
  };
}

describe("users repository", () => {
  it("finds users by email", async () => {
    const findUnique = vi.fn(async () => createUser());
    const repository = buildUsersRepository({
      user: {
        findUnique,
        create: vi.fn()
      }
    } as never);

    const result = await repository.findByEmail("user@example.com");

    expect(result).toEqual(createUser());
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" }
    });
  });

  it("finds users by id", async () => {
    const findUnique = vi.fn(async () => createUser());
    const repository = buildUsersRepository({
      user: {
        findUnique,
        create: vi.fn()
      }
    } as never);

    const result = await repository.findById("user-1");

    expect(result).toEqual(createUser());
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" }
    });
  });

  it("creates users with the provided persistence fields", async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, string> }) =>
      createUser({
        email: data.email,
        passwordHash: data.passwordHash,
        timezone: data.timezone
      })
    );
    const repository = buildUsersRepository({
      user: {
        findUnique: vi.fn(),
        create
      }
    } as never);

    const result = await repository.create({
      email: "new-user@example.com",
      passwordHash: "argon-hash",
      timezone: "Europe/Madrid"
    });

    expect(result).toEqual(
      createUser({
        email: "new-user@example.com",
        passwordHash: "argon-hash",
        timezone: "Europe/Madrid"
      })
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        email: "new-user@example.com",
        passwordHash: "argon-hash",
        timezone: "Europe/Madrid"
      }
    });
  });
});
