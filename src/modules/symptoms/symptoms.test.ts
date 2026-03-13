import { describe, expect, it, vi } from "vitest";

import { decodeOccurredCursor, encodeOccurredCursor } from "../../common/pagination.js";
import { buildSymptomsService } from "./symptoms.service.js";
import type { SymptomsRepository } from "./symptoms.repository.js";

function createSymptomsRepository(): SymptomsRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn()
  };
}

describe("symptoms service", () => {
  it("round-trips symptom cursors", () => {
    const cursor = encodeOccurredCursor({
      occurred_at: "2026-03-13T18:30:00.000Z",
      id: "symptom-1"
    });

    expect(decodeOccurredCursor(cursor)).toEqual({
      occurred_at: "2026-03-13T18:30:00.000Z",
      id: "symptom-1"
    });
  });

  it("returns 404 when ownership filtering hides the symptom event", async () => {
    const repository = createSymptomsRepository();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const service = buildSymptomsService(repository);

    await expect(service.getById("user-1", "symptom-1")).rejects.toMatchObject({
      statusCode: 404,
      problemCode: "NOT_FOUND"
    });
  });

  it("emits next_cursor when there are more rows than the page limit", async () => {
    const repository = createSymptomsRepository();
    vi.mocked(repository.list).mockResolvedValue([
      {
        id: "symptom-3",
        userId: "user-1",
        symptomCode: "bloating",
        severity: 3,
        occurredAt: new Date("2026-03-13T20:00:00.000Z"),
        notes: null,
        createdAt: new Date("2026-03-13T20:05:00.000Z"),
        updatedAt: new Date("2026-03-13T20:05:00.000Z")
      },
      {
        id: "symptom-2",
        userId: "user-1",
        symptomCode: "headache",
        severity: 2,
        occurredAt: new Date("2026-03-13T19:00:00.000Z"),
        notes: null,
        createdAt: new Date("2026-03-13T19:05:00.000Z"),
        updatedAt: new Date("2026-03-13T19:05:00.000Z")
      },
      {
        id: "symptom-1",
        userId: "user-1",
        symptomCode: "nausea",
        severity: 4,
        occurredAt: new Date("2026-03-13T18:00:00.000Z"),
        notes: null,
        createdAt: new Date("2026-03-13T18:05:00.000Z"),
        updatedAt: new Date("2026-03-13T18:05:00.000Z")
      }
    ]);

    const service = buildSymptomsService(repository);
    const result = await service.list("user-1", { limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.page.has_more).toBe(true);
    expect(result.page.next_cursor).not.toBeNull();
  });
});
