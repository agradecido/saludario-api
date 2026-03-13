import { describe, expect, it, vi } from "vitest";

import { buildCategoriesService } from "./categories.service.js";

describe("categories service", () => {
  it("lists categories ordered by sort order", async () => {
    const findMany = vi.fn(async () => [
      { id: 1, code: "breakfast", label: "Breakfast", sortOrder: 1 },
      { id: 2, code: "lunch", label: "Lunch", sortOrder: 2 }
    ]);

    const service = buildCategoriesService({
      mealCategory: {
        findMany
      }
    } as never);

    await expect(service.listAll()).resolves.toEqual({
      data: [
        { code: "breakfast", label: "Breakfast", sort_order: 1 },
        { code: "lunch", label: "Lunch", sort_order: 2 }
      ]
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        sortOrder: "asc"
      }
    });
  });
});
