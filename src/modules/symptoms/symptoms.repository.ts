import type { Prisma, PrismaClient, SymptomEvent } from "@prisma/client";

export interface CreateSymptomInput {
  userId: string;
  symptomCode: string;
  severity: number;
  occurredAt: Date;
  notes?: string;
}

export interface ListSymptomsInput {
  userId: string;
  from?: Date;
  to?: Date;
  symptomCode?: string;
  cursor?: {
    occurredAt: Date;
    id: string;
  };
  limit: number;
}

export interface SymptomsRepository {
  create(input: CreateSymptomInput): Promise<SymptomEvent>;
  findById(id: string, userId: string): Promise<SymptomEvent | null>;
  list(input: ListSymptomsInput): Promise<SymptomEvent[]>;
}

export function buildSymptomsRepository(prisma: PrismaClient): SymptomsRepository {
  return {
    create(input) {
      return prisma.symptomEvent.create({
        data: {
          userId: input.userId,
          symptomCode: input.symptomCode,
          severity: input.severity,
          occurredAt: input.occurredAt,
          notes: input.notes
        }
      });
    },

    findById(id, userId) {
      return prisma.symptomEvent.findFirst({
        where: {
          id,
          userId
        }
      });
    },

    list(input) {
      const where: Prisma.SymptomEventWhereInput = {
        userId: input.userId
      };

      if (input.from || input.to) {
        where.occurredAt = {};

        if (input.from) {
          where.occurredAt.gte = input.from;
        }

        if (input.to) {
          where.occurredAt.lte = input.to;
        }
      }

      if (input.symptomCode) {
        where.symptomCode = input.symptomCode;
      }

      if (input.cursor) {
        where.OR = [
          {
            occurredAt: {
              lt: input.cursor.occurredAt
            }
          },
          {
            occurredAt: input.cursor.occurredAt,
            id: {
              lt: input.cursor.id
            }
          }
        ];
      }

      return prisma.symptomEvent.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: input.limit + 1
      });
    }
  };
}
