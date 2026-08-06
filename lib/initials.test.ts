import { getInitials } from "./initials";

describe("getInitials", () => {
  it("takes the first letter of the first and last word for a multi-word name", () => {
    expect(getInitials("Carlos Pacheco")).toBe("CP");
  });

  it("takes the first letter of the first and last word for a 3+ word name", () => {
    expect(getInitials("Ana Maria Silva")).toBe("AS");
  });

  it("takes the first two characters of a single-word name (e.g. a username)", () => {
    expect(getInitials("cesar")).toBe("CE");
  });

  it("uppercases the result", () => {
    expect(getInitials("carlos pacheco")).toBe("CP");
    expect(getInitials("cesar")).toBe("CE");
  });

  it("collapses extra whitespace between words", () => {
    expect(getInitials("  Carlos   Pacheco  ")).toBe("CP");
  });

  it("returns an empty string for an empty or whitespace-only name", () => {
    expect(getInitials("")).toBe("");
    expect(getInitials("   ")).toBe("");
  });

  it("handles a single-character name without throwing", () => {
    expect(getInitials("a")).toBe("A");
  });
});
