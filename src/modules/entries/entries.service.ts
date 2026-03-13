import { createProblemError } from "../../common/errors.js";
import { decodeCursor, encodeCursor } from "../../common/pagination.js";
import type {
  CreateEntryBody,
  ListEntriesQuery,
  UpdateEntryBody
} from "./entries.schemas.js";
import type { EntriesRepository, EntryRecord } from "./entries.repository.js";

export interface EntryResponse {
  id: string;
  user_id: string;
  meal_category_code: string;
  food_name: string;
  quantity_value: number | null;
  quantity_unit: string | null;
  notes: string | null;
  consumed_at: string;
  created_at: string;
  updated_at: string;
}

export interface EntriesListResponse {
  data: EntryResponse[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface EntriesService {
  create(userId: string, input: CreateEntryBody): Promise<EntryResponse>;
  getById(userId: string, entryId: string): Promise<EntryResponse>;
  update(userId: string, entryId: string, input: UpdateEntryBody): Promise<EntryResponse>;
  remove(userId: string, entryId: string): Promise<void>;
  list(userId: string, query: ListEntriesQuery): Promise<EntriesListResponse>;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }

  return Number(value);
}

function toEntryResponse(entry: EntryRecord): EntryResponse {
  return {
    id: entry.id,
    user_id: entry.userId,
    meal_category_code: entry.mealCategory.code,
    food_name: entry.foodName,
    quantity_value: toNullableNumber(entry.quantityValue),
    quantity_unit: entry.quantityUnit ?? null,
    notes: entry.notes ?? null,
    consumed_at: entry.consumedAt.toISOString(),
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString()
  };
}

async function resolveMealCategoryId(
  repository: EntriesRepository,
  mealCategoryCode: string
): Promise<number> {
  const category = await repository.findMealCategoryByCode(mealCategoryCode);
  if (!category) {
    throw createProblemError(
      400,
      "VALIDATION_ERROR",
      "Validation error",
      "Meal category code is invalid."
    );
  }

  return category.id;
}

export function buildEntriesService(repository: EntriesRepository): EntriesService {
  return {
    async create(userId, input) {
      const mealCategoryId = await resolveMealCategoryId(repository, input.meal_category_code);
      const entry = await repository.create({
        userId,
        mealCategoryId,
        foodName: input.food_name,
        quantityValue: input.quantity_value,
        quantityUnit: input.quantity_unit,
        notes: input.notes,
        consumedAt: new Date(input.consumed_at)
      });

      return toEntryResponse(entry);
    },

    async getById(userId, entryId) {
      const entry = await repository.findById(entryId, userId);
      if (!entry) {
        throw createProblemError(404, "NOT_FOUND", "Not Found", "Food entry not found.");
      }

      return toEntryResponse(entry);
    },

    async update(userId, entryId, input) {
      const mealCategoryId =
        input.meal_category_code !== undefined
          ? await resolveMealCategoryId(repository, input.meal_category_code)
          : undefined;

      const entry = await repository.update(entryId, userId, {
        mealCategoryId,
        foodName: input.food_name,
        quantityValue: input.quantity_value,
        quantityUnit: input.quantity_unit,
        notes: input.notes,
        consumedAt: input.consumed_at ? new Date(input.consumed_at) : undefined
      });

      if (!entry) {
        throw createProblemError(404, "NOT_FOUND", "Not Found", "Food entry not found.");
      }

      return toEntryResponse(entry);
    },

    async remove(userId, entryId) {
      const removed = await repository.remove(entryId, userId);
      if (!removed) {
        throw createProblemError(404, "NOT_FOUND", "Not Found", "Food entry not found.");
      }
    },

    async list(userId, query) {
      let mealCategoryId: number | undefined;
      if (query.meal_category_code) {
        mealCategoryId = await resolveMealCategoryId(repository, query.meal_category_code);
      }

      let cursor:
        | {
            consumedAt: Date;
            id: string;
          }
        | undefined;

      if (query.cursor) {
        try {
          const decoded = decodeCursor(query.cursor);
          cursor = {
            consumedAt: new Date(decoded.consumed_at),
            id: decoded.id
          };
        } catch {
          throw createProblemError(
            400,
            "VALIDATION_ERROR",
            "Validation error",
            "Cursor is invalid."
          );
        }
      }

      const entries = await repository.list({
        userId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        mealCategoryId,
        cursor,
        limit: query.limit
      });

      const hasMore = entries.length > query.limit;
      const pageEntries = hasMore ? entries.slice(0, query.limit) : entries;
      const lastEntry = pageEntries.at(-1) ?? null;

      return {
        data: pageEntries.map(toEntryResponse),
        page: {
          limit: query.limit,
          has_more: hasMore,
          next_cursor:
            hasMore && lastEntry
              ? encodeCursor({
                  consumed_at: lastEntry.consumedAt.toISOString(),
                  id: lastEntry.id
                })
              : null
        }
      };
    }
  };
}
