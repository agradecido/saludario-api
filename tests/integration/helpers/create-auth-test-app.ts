import { createHash, randomUUID } from "node:crypto";

import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import { setAppErrorHandler, zodValidatorCompiler } from "../../../src/app.js";
import { requestIdHook } from "../../../src/common/request-id.js";
import { authRoutes } from "../../../src/modules/auth/auth.routes.js";
import { categoriesRoutes } from "../../../src/modules/categories/categories.routes.js";
import { entriesRoutes } from "../../../src/modules/entries/entries.routes.js";
import { symptomsRoutes } from "../../../src/modules/symptoms/symptoms.routes.js";
import { rateLimitPlugin } from "../../../src/plugins/rate-limit.js";
import { sessionPlugin } from "../../../src/plugins/session.js";

interface TestUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface TestAuthSessionRecord {
  id: string;
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  ipHash: string | null;
  userAgent: string | null;
}

interface TestMealCategoryRecord {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
}

interface TestFoodEntryRecord {
  id: string;
  userId: string;
  mealCategoryId: number;
  foodName: string;
  quantityValue: number | null;
  quantityUnit: string | null;
  notes: string | null;
  consumedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface TestSymptomEventRecord {
  id: string;
  userId: string;
  symptomCode: string;
  severity: number;
  occurredAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTestStore {
  users: TestUserRecord[];
  authSessions: TestAuthSessionRecord[];
  mealCategories: TestMealCategoryRecord[];
  foodEntries: TestFoodEntryRecord[];
  symptomEvents: TestSymptomEventRecord[];
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function compareEntriesDescending(left: TestFoodEntryRecord, right: TestFoodEntryRecord): number {
  const consumedAtDiff = right.consumedAt.getTime() - left.consumedAt.getTime();
  if (consumedAtDiff !== 0) {
    return consumedAtDiff;
  }

  return right.id.localeCompare(left.id);
}

function matchesScalar(value: unknown, condition: unknown): boolean {
  if (
    typeof condition === "object" &&
    condition !== null &&
    !Array.isArray(condition) &&
    !(condition instanceof Date)
  ) {
    const operator = condition as {
      gte?: Date;
      lte?: Date;
      lt?: Date | string;
    };

    if (operator.gte && (!(value instanceof Date) || value < operator.gte)) {
      return false;
    }

    if (operator.lte && (!(value instanceof Date) || value > operator.lte)) {
      return false;
    }

    if (operator.lt) {
      if (value instanceof Date) {
        return operator.lt instanceof Date ? value < operator.lt : value.toISOString() < operator.lt;
      }

      if (typeof value === "string") {
        return value < String(operator.lt);
      }
    }

    return true;
  }

  if (value instanceof Date && condition instanceof Date) {
    return value.getTime() === condition.getTime();
  }

  return value === condition;
}

function matchesEntryWhere(
  entry: TestFoodEntryRecord,
  where: Record<string, unknown> | undefined
): boolean {
  if (!where) {
    return true;
  }

  const { OR, ...rest } = where;
  const baseMatches = Object.entries(rest).every(([key, value]) => {
    const entryValue = entry[key as keyof TestFoodEntryRecord];
    return matchesScalar(entryValue, value);
  });

  if (!baseMatches) {
    return false;
  }

  if (!Array.isArray(OR) || OR.length === 0) {
    return true;
  }

  return OR.some((clause) => matchesEntryWhere(entry, clause as Record<string, unknown>));
}

function compareSymptomsDescending(left: TestSymptomEventRecord, right: TestSymptomEventRecord): number {
  const occurredAtDiff = right.occurredAt.getTime() - left.occurredAt.getTime();
  if (occurredAtDiff !== 0) {
    return occurredAtDiff;
  }

  return right.id.localeCompare(left.id);
}

function matchesSymptomWhere(
  event: TestSymptomEventRecord,
  where: Record<string, unknown> | undefined
): boolean {
  if (!where) {
    return true;
  }

  const { OR, ...rest } = where;
  const baseMatches = Object.entries(rest).every(([key, value]) => {
    const eventValue = event[key as keyof TestSymptomEventRecord];
    return matchesScalar(eventValue, value);
  });

  if (!baseMatches) {
    return false;
  }

  if (!Array.isArray(OR) || OR.length === 0) {
    return true;
  }

  return OR.some((clause) => matchesSymptomWhere(event, clause as Record<string, unknown>));
}

function createPrismaMock(store: AuthTestStore) {
  function getMealCategoryById(mealCategoryId: number): TestMealCategoryRecord {
    const mealCategory = store.mealCategories.find((category) => category.id === mealCategoryId);
    if (!mealCategory) {
      throw new Error(`Meal category ${mealCategoryId} not found`);
    }

    return mealCategory;
  }

  function attachMealCategory(entry: TestFoodEntryRecord) {
    return {
      ...entry,
      mealCategory: getMealCategoryById(entry.mealCategoryId)
    };
  }

  return {
    user: {
      async findUnique({
        where
      }: {
        where: {
          id?: string;
          email?: string;
        };
      }) {
        if (where.email) {
          return store.users.find((user) => user.email === where.email) ?? null;
        }

        if (where.id) {
          return store.users.find((user) => user.id === where.id) ?? null;
        }

        return null;
      },
      async create({
        data
      }: {
        data: {
          email: string;
          passwordHash: string;
          timezone: string;
        };
      }) {
        const existing = store.users.find((user) => user.email === data.email);
        if (existing) {
          const error = new Error("Unique constraint failed");
          Object.assign(error, {
            code: "P2002",
            name: "PrismaClientKnownRequestError"
          });
          throw error;
        }

        const now = new Date();
        const user: TestUserRecord = {
          id: randomUUID(),
          email: data.email,
          passwordHash: data.passwordHash,
          timezone: data.timezone,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        };

        store.users.push(user);
        return user;
      }
    },
    authSession: {
      async create({
        data
      }: {
        data: {
          userId: string;
          sessionTokenHash: string;
          expiresAt: Date;
          ipHash: string | null;
          userAgent: string | null;
        };
      }) {
        const session: TestAuthSessionRecord = {
          id: randomUUID(),
          userId: data.userId,
          sessionTokenHash: data.sessionTokenHash,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
          revokedAt: null,
          ipHash: data.ipHash,
          userAgent: data.userAgent
        };

        store.authSessions.push(session);
        return session;
      },
      async findFirst({
        where
      }: {
        where: {
          sessionTokenHash: string;
          revokedAt: null;
          expiresAt: {
            gt: Date;
          };
        };
      }) {
        return (
          store.authSessions.find(
            (session) =>
              session.sessionTokenHash === where.sessionTokenHash &&
              session.revokedAt === null &&
              session.expiresAt > where.expiresAt.gt
          ) ?? null
        );
      },
      async updateMany({
        where,
        data
      }: {
        where: {
          sessionTokenHash: string;
          revokedAt: null;
        };
        data: {
          revokedAt: Date;
        };
      }) {
        let count = 0;

        for (const session of store.authSessions) {
          if (session.sessionTokenHash === where.sessionTokenHash && session.revokedAt === null) {
            session.revokedAt = data.revokedAt;
            count += 1;
          }
        }

        return { count };
      }
    },
    mealCategory: {
      async findMany({
        orderBy
      }: {
        orderBy?: {
          sortOrder?: "asc" | "desc";
        };
      } = {}) {
        const direction = orderBy?.sortOrder ?? "asc";
        const categories = [...store.mealCategories].sort((left, right) =>
          direction === "asc" ? left.sortOrder - right.sortOrder : right.sortOrder - left.sortOrder
        );

        return categories;
      },
      async findUnique({
        where
      }: {
        where: {
          id?: number;
          code?: string;
        };
      }) {
        if (typeof where.id === "number") {
          return store.mealCategories.find((category) => category.id === where.id) ?? null;
        }

        if (typeof where.code === "string") {
          return store.mealCategories.find((category) => category.code === where.code) ?? null;
        }

        return null;
      }
    },
    foodEntry: {
      async create({
        data
      }: {
        data: {
          userId: string;
          mealCategoryId: number;
          foodName: string;
          quantityValue?: number;
          quantityUnit?: string;
          notes?: string;
          consumedAt: Date;
        };
      }) {
        const now = new Date();
        const entry: TestFoodEntryRecord = {
          id: randomUUID(),
          userId: data.userId,
          mealCategoryId: data.mealCategoryId,
          foodName: data.foodName,
          quantityValue: data.quantityValue ?? null,
          quantityUnit: data.quantityUnit ?? null,
          notes: data.notes ?? null,
          consumedAt: data.consumedAt,
          createdAt: now,
          updatedAt: now
        };

        store.foodEntries.push(entry);
        return attachMealCategory(entry);
      },
      async findFirst({
        where
      }: {
        where?: Record<string, unknown>;
      }) {
        const entry =
          store.foodEntries
            .filter((candidate) => matchesEntryWhere(candidate, where))
            .sort(compareEntriesDescending)[0] ?? null;

        return entry ? attachMealCategory(entry) : null;
      },
      async update({
        where,
        data
      }: {
        where: {
          id: string;
        };
        data: {
          mealCategoryId?: number;
          foodName?: string;
          quantityValue?: number;
          quantityUnit?: string;
          notes?: string;
          consumedAt?: Date;
        };
      }) {
        const entry = store.foodEntries.find((candidate) => candidate.id === where.id);
        if (!entry) {
          throw new Error(`Food entry ${where.id} not found`);
        }

        entry.mealCategoryId = data.mealCategoryId ?? entry.mealCategoryId;
        entry.foodName = data.foodName ?? entry.foodName;
        entry.quantityValue = data.quantityValue ?? entry.quantityValue;
        entry.quantityUnit = data.quantityUnit ?? entry.quantityUnit;
        entry.notes = data.notes ?? entry.notes;
        entry.consumedAt = data.consumedAt ?? entry.consumedAt;
        entry.updatedAt = new Date();

        return attachMealCategory(entry);
      },
      async delete({
        where
      }: {
        where: {
          id: string;
        };
      }) {
        const index = store.foodEntries.findIndex((candidate) => candidate.id === where.id);
        if (index === -1) {
          throw new Error(`Food entry ${where.id} not found`);
        }

        const [entry] = store.foodEntries.splice(index, 1);
        if (!entry) {
          throw new Error(`Food entry ${where.id} not found`);
        }

        return attachMealCategory(entry);
      },
      async findMany({
        where,
        take
      }: {
        where?: Record<string, unknown>;
        take?: number;
      }) {
        const entries = store.foodEntries
          .filter((candidate) => matchesEntryWhere(candidate, where))
          .sort(compareEntriesDescending)
          .slice(0, typeof take === "number" ? take : store.foodEntries.length);

        return entries.map(attachMealCategory);
      }
    },
    symptomEvent: {
      async create({
        data
      }: {
        data: {
          userId: string;
          symptomCode: string;
          severity: number;
          occurredAt: Date;
          notes?: string;
        };
      }) {
        const now = new Date();
        const event: TestSymptomEventRecord = {
          id: randomUUID(),
          userId: data.userId,
          symptomCode: data.symptomCode,
          severity: data.severity,
          occurredAt: data.occurredAt,
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now
        };

        store.symptomEvents.push(event);
        return event;
      },
      async findFirst({
        where
      }: {
        where?: Record<string, unknown>;
      }) {
        return (
          store.symptomEvents
            .filter((candidate) => matchesSymptomWhere(candidate, where))
            .sort(compareSymptomsDescending)[0] ?? null
        );
      },
      async findMany({
        where,
        take
      }: {
        where?: Record<string, unknown>;
        take?: number;
      }) {
        return store.symptomEvents
          .filter((candidate) => matchesSymptomWhere(candidate, where))
          .sort(compareSymptomsDescending)
          .slice(0, typeof take === "number" ? take : store.symptomEvents.length);
      }
    },
    hashValue
  };
}

export async function createAuthTestApp(): Promise<{
  app: FastifyInstance;
  store: AuthTestStore;
}> {
  const store: AuthTestStore = {
    users: [],
    authSessions: [],
    mealCategories: [
      { id: 1, code: "breakfast", label: "Breakfast", sortOrder: 1 },
      { id: 2, code: "lunch", label: "Lunch", sortOrder: 2 },
      { id: 3, code: "dinner", label: "Dinner", sortOrder: 3 },
      { id: 4, code: "snack", label: "Snack", sortOrder: 4 }
    ],
    foodEntries: [],
    symptomEvents: []
  };
  const prisma = createPrismaMock(store);

  const app = Fastify({ logger: false });
  app.setValidatorCompiler(zodValidatorCompiler);
  app.addHook("onRequest", requestIdHook);
  app.decorate("prisma", prisma as never);
  setAppErrorHandler(app);

  await app.register(sessionPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(categoriesRoutes, { prefix: "/api/v1/categories" });
  await app.register(entriesRoutes, { prefix: "/api/v1/entries" });
  await app.register(symptomsRoutes, { prefix: "/api/v1/internal/symptoms" });

  return { app, store };
}
