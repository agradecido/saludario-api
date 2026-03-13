import { describe, expect, it } from "vitest";

import { isWeakSessionSecret } from "./index.js";

describe("config security helpers", () => {
  it("rejects placeholder and predictable session secrets", () => {
    expect(isWeakSessionSecret("replace_with_64_char_random_hex")).toBe(true);
    expect(
      isWeakSessionSecret("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
    ).toBe(true);
    expect(isWeakSessionSecret("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(true);
  });

  it("accepts non-placeholder random-looking session secrets", () => {
    expect(
      isWeakSessionSecret("6e734a2bcf3d4f7db1f90ce2a4b58774f1b7a812f85ab1d53d3c5ec1cfca4529")
    ).toBe(false);
  });
});
