jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getLikesForProgress, likeProgress, unlikeProgress } from "./likes";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getLikesForProgress", () => {
  it("returns an empty array without querying for an empty id list", async () => {
    const result = await getLikesForProgress([]);
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("queries likes for the given progress ids", async () => {
    const chain = createChainableQueryMock({ data: [{ progress_id: "p1", user_id: "u1" }], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getLikesForProgress(["p1", "p2"]);

    expect(chain.in).toHaveBeenCalledWith("progress_id", ["p1", "p2"]);
    expect(result).toEqual([{ progress_id: "p1", user_id: "u1" }]);
  });
});

describe("likeProgress", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(likeProgress("p1")).rejects.toThrow("Not signed in");
  });

  it("inserts a like row for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await likeProgress("p1");

    expect(chain.insert).toHaveBeenCalledWith({ progress_id: "p1", user_id: "u1" });
  });
});

describe("unlikeProgress", () => {
  it("deletes the matching like row for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await unlikeProgress("p1");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "progress_id", "p1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "user_id", "u1");
  });
});
