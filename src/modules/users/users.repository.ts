import type { PrismaClient, User } from "@prisma/client";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  timezone: string;
}

export interface UsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}

export function buildUsersRepository(prisma: PrismaClient): UsersRepository {
  return {
    findByEmail(email) {
      return prisma.user.findUnique({
        where: { email }
      });
    },

    findById(id) {
      return prisma.user.findUnique({
        where: { id }
      });
    },

    create(input) {
      return prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          timezone: input.timezone
        }
      });
    }
  };
}
