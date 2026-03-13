import type { PrismaClient } from "@prisma/client";

export interface CategoryResponse {
  code: string;
  label: string;
  sort_order: number;
}

export interface CategoriesService {
  listAll(): Promise<{ data: CategoryResponse[] }>;
}

export function buildCategoriesService(prisma: PrismaClient): CategoriesService {
  return {
    async listAll() {
      const categories = await prisma.mealCategory.findMany({
        orderBy: {
          sortOrder: "asc"
        }
      });

      return {
        data: categories.map((category) => ({
          code: category.code,
          label: category.label,
          sort_order: category.sortOrder
        }))
      };
    }
  };
}
