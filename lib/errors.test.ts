import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns the message from a native Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the message from a PostgrestError-like plain object", () => {
    expect(getErrorMessage({ message: "row not found", code: "PGRST116" })).toBe("row not found");
  });

  it("falls back to String() for values with no usable message", () => {
    expect(getErrorMessage("plain string")).toBe("plain string");
    expect(getErrorMessage(42)).toBe("42");
    expect(getErrorMessage(null)).toBe("null");
    expect(getErrorMessage(undefined)).toBe("undefined");
  });

  it("falls back to String() when .message is present but not a string", () => {
    expect(getErrorMessage({ message: 123 })).toBe("[object Object]");
  });
});
