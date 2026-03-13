import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { code: "breakfast", label: "Breakfast", sortOrder: 1 },
  { code: "lunch", label: "Lunch", sortOrder: 2 },
  { code: "dinner", label: "Dinner", sortOrder: 3 },
  { code: "snack", label: "Snack", sortOrder: 4 }
];

async function main(): Promise<void> {
  for (const category of categories) {
    await prisma.mealCategory.upsert({
      where: { code: category.code },
      update: {
        label: category.label,
        sortOrder: category.sortOrder
      },
      create: category
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
