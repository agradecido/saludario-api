import { createProblemError } from "../../common/errors.js";
import { decodeOccurredCursor, encodeOccurredCursor } from "../../common/pagination.js";
import type {
  CreateSymptomBody,
  ListSymptomsQuery
} from "./symptoms.schemas.js";
import type { SymptomsRepository } from "./symptoms.repository.js";

export interface SymptomEventResponse {
  id: string;
  user_id: string;
  symptom_code: string;
  severity: number;
  occurred_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SymptomsListResponse {
  data: SymptomEventResponse[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface SymptomsService {
  create(userId: string, input: CreateSymptomBody): Promise<SymptomEventResponse>;
  getById(userId: string, symptomEventId: string): Promise<SymptomEventResponse>;
  list(userId: string, query: ListSymptomsQuery): Promise<SymptomsListResponse>;
}

function toSymptomEventResponse(event: {
  id: string;
  userId: string;
  symptomCode: string;
  severity: number;
  occurredAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SymptomEventResponse {
  return {
    id: event.id,
    user_id: event.userId,
    symptom_code: event.symptomCode,
    severity: event.severity,
    occurred_at: event.occurredAt.toISOString(),
    notes: event.notes ?? null,
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString()
  };
}

export function buildSymptomsService(repository: SymptomsRepository): SymptomsService {
  return {
    async create(userId, input) {
      const event = await repository.create({
        userId,
        symptomCode: input.symptom_code,
        severity: input.severity,
        occurredAt: new Date(input.occurred_at),
        notes: input.notes
      });

      return toSymptomEventResponse(event);
    },

    async getById(userId, symptomEventId) {
      const event = await repository.findById(symptomEventId, userId);
      if (!event) {
        throw createProblemError(404, "NOT_FOUND", "Not Found", "Symptom event not found.");
      }

      return toSymptomEventResponse(event);
    },

    async list(userId, query) {
      let cursor:
        | {
            occurredAt: Date;
            id: string;
          }
        | undefined;

      if (query.cursor) {
        try {
          const decoded = decodeOccurredCursor(query.cursor);
          cursor = {
            occurredAt: new Date(decoded.occurred_at),
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

      const events = await repository.list({
        userId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        symptomCode: query.symptom_code,
        cursor,
        limit: query.limit
      });

      const hasMore = events.length > query.limit;
      const pageEvents = hasMore ? events.slice(0, query.limit) : events;
      const lastEvent = pageEvents.at(-1) ?? null;

      return {
        data: pageEvents.map(toSymptomEventResponse),
        page: {
          limit: query.limit,
          has_more: hasMore,
          next_cursor:
            hasMore && lastEvent
              ? encodeOccurredCursor({
                  occurred_at: lastEvent.occurredAt.toISOString(),
                  id: lastEvent.id
                })
              : null
        }
      };
    }
  };
}
