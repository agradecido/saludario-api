import type { MealCategory, Prisma, PrismaClient } from "@prisma/client";

export type EntryRecord = Prisma.FoodEntryGetPayload<{
  include: {
    mealCategory: true;
  };
}>;

export interface CreateEntryInput {
  userId: string;
  mealCategoryId: number;
  foodName: string;
  quantityValue?: number;
  quantityUnit?: string;
  notes?: string;
  consumedAt: Date;
}

export interface UpdateEntryInput {
  mealCategoryId?: number;
  foodName?: string;
  quantityValue?: number;
  quantityUnit?: string;
  notes?: string;
  consumedAt?: Date;
}

export interface EntryListCursor {
  consumedAt: Date;
  id: string;
}

export interface ListEntriesInput {
  userId: string;
  from?: Date;
  to?: Date;
  mealCategoryId?: number;
  cursor?: EntryListCursor;
  limit: number;
}

export interface EntriesRepository {
  findMealCategoryByCode(code: string): Promise<MealCategory | null>;
  create(input: CreateEntryInput): Promise<EntryRecord>;
  findById(id: string, userId: string): Promise<EntryRecord | null>;
  update(id: string, userId: string, input: UpdateEntryInput): Promise<EntryRecord | null>;
  remove(id: string, userId: string): Promise<boolean>;
  list(input: ListEntriesInput): Promise<EntryRecord[]>;
}

function includeMealCategory() {
  return {
    mealCategory: true
  } as const;
}

export function buildEntriesRepository(prisma: PrismaClient): EntriesRepository {
  return {
    findMealCategoryByCode(code) {
      return prisma.mealCategory.findUnique({
        where: { code }
      });
    },

    create(input) {
      return prisma.foodEntry.create({
        data: {
          userId: input.userId,
          mealCategoryId: input.mealCategoryId,
          foodName: input.foodName,
          quantityValue: input.quantityValue,
          quantityUnit: input.quantityUnit,
          notes: input.notes,
          consumedAt: input.consumedAt
        },
        include: includeMealCategory()
      });
    },

    findById(id, userId) {
      return prisma.foodEntry.findFirst({
        where: {
          id,
          userId
        },
        include: includeMealCategory()
      });
    },

    async update(id, userId, input) {
      const existing = await prisma.foodEntry.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existing) {
        return null;
      }

      return prisma.foodEntry.update({
        where: { id },
        data: {
          mealCategoryId: input.mealCategoryId,
          foodName: input.foodName,
          quantityValue: input.quantityValue,
          quantityUnit: input.quantityUnit,
          notes: input.notes,
          consumedAt: input.consumedAt
        },
        include: includeMealCategory()
      });
    },

    async remove(id, userId) {
      const existing = await prisma.foodEntry.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!existing) {
        return false;
      }

      await prisma.foodEntry.delete({
        where: { id }
      });
      return true;
    },

    list(input) {
      const where: Prisma.FoodEntryWhereInput = {
        userId: input.userId
      };

      if (input.from || input.to) {
        where.consumedAt = {};

        if (input.from) {
          where.consumedAt.gte = input.from;
        }

        if (input.to) {
          where.consumedAt.lte = input.to;
        }
      }

      if (typeof input.mealCategoryId === "number") {
        where.mealCategoryId = input.mealCategoryId;
      }

      if (input.cursor) {
        where.OR = [
          {
            consumedAt: {
              lt: input.cursor.consumedAt
            }
          },
          {
            consumedAt: input.cursor.consumedAt,
            id: {
              lt: input.cursor.id
            }
          }
        ];
      }

      return prisma.foodEntry.findMany({
        where,
        include: includeMealCategory(),
        orderBy: [{ consumedAt: "desc" }, { id: "desc" }],
        take: input.limit + 1
      });
    }
  };
}
