import { z } from "zod";

export const isoDatetime = z.string().datetime({ offset: true });

export const uuidParam = z.object({
  id: z.string().uuid()
});

export const paginationQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().min(1).optional()
});
