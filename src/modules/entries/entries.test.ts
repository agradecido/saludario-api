import { describe, expect, it, vi } from "vitest";

import { decodeCursor, encodeCursor } from "../../common/pagination.js";
import { buildEntriesService } from "./entries.service.js";
import type { EntriesRepository } from "./entries.repository.js";

function createEntriesRepository(): EntriesRepository {
  return {
    findMealCategoryByCode: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    list: vi.fn()
  };
}

describe("entries service", () => {
  it("round-trips cursors using the shared pagination helpers", () => {
    const cursor = encodeCursor({
      consumed_at: "2026-03-13T10:00:00.000Z",
      id: "entry-1"
    });

    expect(decodeCursor(cursor)).toEqual({
      consumed_at: "2026-03-13T10:00:00.000Z",
      id: "entry-1"
    });
  });

  it("rejects unknown meal category codes", async () => {
    const repository = createEntriesRepository();
    vi.mocked(repository.findMealCategoryByCode).mockResolvedValue(null);

    const service = buildEntriesService(repository);

    await expect(
      service.create("user-1", {
        meal_category_code: "lunch",
        food_name: "Soup",
        consumed_at: "2026-03-13T10:00:00.000Z"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      problemCode: "VALIDATION_ERROR"
    });
  });

  it("returns 404 when ownership filtering hides the entry", async () => {
    const repository = createEntriesRepository();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const service = buildEntriesService(repository);

    await expect(service.getById("user-1", "entry-1")).rejects.toMatchObject({
      statusCode: 404,
      problemCode: "NOT_FOUND"
    });
  });

  it("emits next_cursor when there are more rows than the page limit", async () => {
    const repository = createEntriesRepository();
    vi.mocked(repository.list).mockResolvedValue([
      {
        id: "entry-3",
        userId: "user-1",
        mealCategoryId: 2,
        foodName: "Dinner",
        quantityValue: null,
        quantityUnit: null,
        notes: null,
        consumedAt: new Date("2026-03-13T12:00:00.000Z"),
        createdAt: new Date("2026-03-13T12:01:00.000Z"),
        updatedAt: new Date("2026-03-13T12:01:00.000Z"),
        mealCategory: { id: 2, code: "lunch", label: "Lunch", sortOrder: 2 }
      },
      {
        id: "entry-2",
        userId: "user-1",
        mealCategoryId: 2,
        foodName: "Snack",
        quantityValue: null,
        quantityUnit: null,
        notes: null,
        consumedAt: new Date("2026-03-13T11:00:00.000Z"),
        createdAt: new Date("2026-03-13T11:01:00.000Z"),
        updatedAt: new Date("2026-03-13T11:01:00.000Z"),
        mealCategory: { id: 2, code: "lunch", label: "Lunch", sortOrder: 2 }
      },
      {
        id: "entry-1",
        userId: "user-1",
        mealCategoryId: 2,
        foodName: "Breakfast",
        quantityValue: null,
        quantityUnit: null,
        notes: null,
        consumedAt: new Date("2026-03-13T10:00:00.000Z"),
        createdAt: new Date("2026-03-13T10:01:00.000Z"),
        updatedAt: new Date("2026-03-13T10:01:00.000Z"),
        mealCategory: { id: 2, code: "lunch", label: "Lunch", sortOrder: 2 }
      }
    ] as never);

    const service = buildEntriesService(repository);
    const result = await service.list("user-1", { limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.page.has_more).toBe(true);
    expect(result.page.next_cursor).not.toBeNull();
  });
});
