jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import {
  getUsernameChangeCooldownDays,
  isUsernameAvailable,
  nextUsernameChangeDate,
  normalizeUsername,
  validateUsername,
} from "./usernames";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Plant.Parent_42  ")).toBe("plant.parent_42");
  });
});

describe("validateUsername", () => {
  it.each(["abc", "plant.parent_42", "carlos", "a.b_c.d", "user_d97979b8", "abcdefghij0123456789"])(
    "accepts %s",
    (name) => {
      expect(validateUsername(name)).toBeNull();
    }
  );

  it("rejects too short and too long", () => {
    expect(validateUsername("ab")).toMatch(/3–20/);
    expect(validateUsername("a".repeat(21))).toMatch(/3–20/);
  });

  it("rejects a leading digit, dot, or underscore", () => {
    expect(validateUsername("1abc")).toMatch(/start with a letter/);
    expect(validateUsername(".abc")).toMatch(/start with a letter/);
    expect(validateUsername("_abc")).toMatch(/start with a letter/);
  });

  it("rejects uppercase and other characters (normalization happens before validation)", () => {
    expect(validateUsername("Carlos")).toMatch(/start with a letter/);
    expect(validateUsername("car los")).toMatch(/lowercase letters, numbers, dots, and underscores/);
    expect(validateUsername("carlos!")).toMatch(/lowercase letters, numbers, dots, and underscores/);
  });

  it("rejects a trailing dot or underscore", () => {
    expect(validateUsername("carlos.")).toMatch(/end with a letter or number/);
    expect(validateUsername("carlos_")).toMatch(/end with a letter or number/);
  });

  it.each(["a..b", "a__b", "a._b", "a_.b"])("rejects adjacent separators in %s", (name) => {
    expect(validateUsername(name)).toMatch(/doubled or next to each other/);
  });
});

describe("nextUsernameChangeDate", () => {
  const now = new Date("2026-07-09T12:00:00Z");

  it("returns null when the username was never changed", () => {
    expect(nextUsernameChangeDate(null, 5, now)).toBeNull();
  });

  it("returns the end of the window while inside the cooldown", () => {
    const next = nextUsernameChangeDate("2026-07-07T12:00:00Z", 5, now);
    expect(next?.toISOString()).toBe("2026-07-12T12:00:00.000Z");
  });

  it("returns null exactly at the boundary and after", () => {
    expect(nextUsernameChangeDate("2026-07-04T12:00:00Z", 5, now)).toBeNull();
    expect(nextUsernameChangeDate("2026-01-01T00:00:00Z", 5, now)).toBeNull();
  });
});

describe("isUsernameAvailable", () => {
  it("calls the username_available RPC with the normalized candidate", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

    await expect(isUsernameAvailable("  Carlos  ")).resolves.toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("username_available", { candidate: "carlos" });
  });

  it("returns false when the RPC says taken", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

    await expect(isUsernameAvailable("carlos")).resolves.toBe(false);
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "network" };
    mockSupabase.rpc.mockResolvedValue({ data: null, error: err });

    await expect(isUsernameAvailable("carlos")).rejects.toBe(err);
  });
});

describe("getUsernameChangeCooldownDays", () => {
  it("reads the value from app_config", async () => {
    const chain = createChainableQueryMock({ data: { value: "7" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await expect(getUsernameChangeCooldownDays()).resolves.toBe(7);
    expect(mockSupabase.from).toHaveBeenCalledWith("app_config");
    expect(chain.eq).toHaveBeenCalledWith("key", "username_change_cooldown_days");
  });

  it("falls back to 5 when the stored value isn't numeric", async () => {
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { value: "soon" }, error: null }));

    await expect(getUsernameChangeCooldownDays()).resolves.toBe(5);
  });
});
