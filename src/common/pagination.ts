export interface ConsumedCursor {
  consumed_at: string;
  id: string;
}

export function encodeCursor(payload: ConsumedCursor): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(opaque: string): ConsumedCursor {
  const json = Buffer.from(opaque, "base64url").toString("utf8");
  const parsed = JSON.parse(json) as Partial<ConsumedCursor>;

  if (!parsed.consumed_at || !parsed.id) {
    throw new Error("Invalid cursor payload");
  }

  return {
    consumed_at: parsed.consumed_at,
    id: parsed.id
  };
}
