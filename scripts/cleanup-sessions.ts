import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const now = new Date();

  const result = await prisma.authSession.deleteMany({
    where: {
      OR: [
        {
          expiresAt: {
            lt: now
          }
        },
        {
          revokedAt: {
            not: null
          }
        }
      ]
    }
  });

  console.log(`Deleted ${result.count} expired or revoked auth sessions.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Session cleanup failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
