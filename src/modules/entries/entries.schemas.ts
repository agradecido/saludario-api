import { z } from "zod";

import { isoDatetime, paginationQuery } from "../../common/schemas.js";

export const mealCategoryCodeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const optionalTrimmedString = (maxLength: number) => z.string().trim().min(1).max(maxLength);

export const createEntryBodySchema = z
  .object({
    meal_category_code: mealCategoryCodeSchema,
    food_name: z.string().trim().min(1).max(500),
    quantity_value: z.number().positive().optional(),
    quantity_unit: optionalTrimmedString(50).optional(),
    notes: z.string().trim().max(2000).optional(),
    consumed_at: isoDatetime
  })
  .strict();

export const updateEntryBodySchema = z
  .object({
    meal_category_code: mealCategoryCodeSchema.optional(),
    food_name: z.string().trim().min(1).max(500).optional(),
    quantity_value: z.number().positive().optional(),
    quantity_unit: optionalTrimmedString(50).optional(),
    notes: z.string().trim().max(2000).optional(),
    consumed_at: isoDatetime.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided."
  });

export const listEntriesQuerySchema = paginationQuery
  .extend({
    from: isoDatetime.optional(),
    to: isoDatetime.optional(),
    meal_category_code: mealCategoryCodeSchema.optional()
  })
  .refine(
    (value) =>
      !value.from || !value.to || new Date(value.from).getTime() <= new Date(value.to).getTime(),
    {
      message: "`from` must be earlier than or equal to `to`.",
      path: ["from"]
    }
  );

export const entryIdParamsSchema = z.object({
  entry_id: z.string().uuid()
});

export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;
export type UpdateEntryBody = z.infer<typeof updateEntryBodySchema>;
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
