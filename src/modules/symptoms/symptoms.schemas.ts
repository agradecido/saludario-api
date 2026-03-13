import { z } from "zod";

import { isoDatetime, paginationQuery } from "../../common/schemas.js";

export const createSymptomBodySchema = z
  .object({
    symptom_code: z.string().trim().min(1).max(100),
    severity: z.number().int().min(1).max(5),
    occurred_at: isoDatetime,
    notes: z.string().trim().max(2000).optional()
  })
  .strict();

export const listSymptomsQuerySchema = paginationQuery
  .extend({
    from: isoDatetime.optional(),
    to: isoDatetime.optional(),
    symptom_code: z.string().trim().min(1).max(100).optional()
  })
  .refine(
    (value) =>
      !value.from || !value.to || new Date(value.from).getTime() <= new Date(value.to).getTime(),
    {
      message: "`from` must be earlier than or equal to `to`.",
      path: ["from"]
    }
  );

export const symptomEventIdParamsSchema = z.object({
  symptom_event_id: z.string().uuid()
});

export type CreateSymptomBody = z.infer<typeof createSymptomBodySchema>;
export type ListSymptomsQuery = z.infer<typeof listSymptomsQuerySchema>;
