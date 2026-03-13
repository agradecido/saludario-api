export interface ConsumedCursor {
  consumed_at: string;
  id: string;
}

export interface OccurredCursor {
  occurred_at: string;
  id: string;
}

function encodePayload(payload: object): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

function decodePayload(opaque: string): Record<string, string> {
  const json = Buffer.from(opaque, "base64url").toString("utf8");
  return JSON.parse(json) as Record<string, string>;
}

export function encodeCursor(payload: ConsumedCursor): string {
  return encodePayload(payload);
}

export function decodeCursor(opaque: string): ConsumedCursor {
  const parsed = decodePayload(opaque) as Partial<ConsumedCursor>;

  if (!parsed.consumed_at || !parsed.id) {
    throw new Error("Invalid cursor payload");
  }

  return {
    consumed_at: parsed.consumed_at,
    id: parsed.id
  };
}

export function encodeOccurredCursor(payload: OccurredCursor): string {
  return encodePayload(payload);
}

export function decodeOccurredCursor(opaque: string): OccurredCursor {
  const parsed = decodePayload(opaque) as Partial<OccurredCursor>;

  if (!parsed.occurred_at || !parsed.id) {
    throw new Error("Invalid cursor payload");
  }

  return {
    occurred_at: parsed.occurred_at,
    id: parsed.id
  };
}
