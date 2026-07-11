jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getPrivacyPolicyUpdatedAt, isConsentCurrent } from "./consent";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isConsentCurrent", () => {
  it("is false without any acceptance, regardless of the policy date", () => {
    expect(isConsentCurrent(null, null)).toBe(false);
    expect(isConsentCurrent(null, "2026-07-09T00:00:00Z")).toBe(false);
  });

  it("fails open when the policy date is missing: any acceptance counts", () => {
    expect(isConsentCurrent("2020-01-01T00:00:00Z", null)).toBe(true);
  });

  it("is false when the acceptance predates the policy", () => {
    expect(isConsentCurrent("2026-07-08T23:59:59Z", "2026-07-09T00:00:00Z")).toBe(false);
  });

  it("is true when the acceptance is on or after the policy date", () => {
    expect(isConsentCurrent("2026-07-09T00:00:00Z", "2026-07-09T00:00:00Z")).toBe(true);
    expect(isConsentCurrent("2026-07-10T12:00:00Z", "2026-07-09T00:00:00Z")).toBe(true);
  });
});

describe("getPrivacyPolicyUpdatedAt", () => {
  it("reads the app_config row and returns its value", async () => {
    const chain = createChainableQueryMock({ data: { value: "2026-07-09T00:00:00Z" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getPrivacyPolicyUpdatedAt();

    expect(mockSupabase.from).toHaveBeenCalledWith("app_config");
    expect(chain.eq).toHaveBeenCalledWith("key", "privacy_policy_updated_at");
    expect(result).toBe("2026-07-09T00:00:00Z");
  });

  it("returns null when the row is missing", async () => {
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null }));

    await expect(getPrivacyPolicyUpdatedAt()).resolves.toBeNull();
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "network error" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(getPrivacyPolicyUpdatedAt()).rejects.toBe(err);
  });
});
