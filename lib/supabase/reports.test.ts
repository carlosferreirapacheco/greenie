jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { submitReport } from "./reports";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("submitReport", () => {
  it("throws Not signed in without inserting when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      submitReport({ targetType: "user", targetId: "u2", reason: "spam", details: null })
    ).rejects.toThrow("Not signed in");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("inserts a report row for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await submitReport({ targetType: "progress_report", targetId: "p1", reason: "spam", details: null });

    expect(mockSupabase.from).toHaveBeenCalledWith("reports");
    expect(chain.insert).toHaveBeenCalledWith({
      reporter_id: "u1",
      target_type: "progress_report",
      target_id: "p1",
      reason: "spam",
      details: null,
    });
  });

  it("passes through optional details text", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await submitReport({ targetType: "comment", targetId: "c1", reason: "other", details: "spoke rudely" });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ target_type: "comment", target_id: "c1", reason: "other", details: "spoke rudely" })
    );
  });

  it("throws the Supabase error on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const err = { message: "db error" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(
      submitReport({ targetType: "user", targetId: "u2", reason: "harassment", details: null })
    ).rejects.toBe(err);
  });
});
