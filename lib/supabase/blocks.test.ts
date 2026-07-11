jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getMyBlockStatus, blockUser, unblockUser, getBlockedUsers } from "./blocks";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMyBlockStatus", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getMyBlockStatus("u2")).rejects.toThrow("Not signed in");
  });

  it("returns 'blocked_by_me' when a block row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { blocker_id: "u1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getMyBlockStatus("u2");

    expect(chain.eq).toHaveBeenNthCalledWith(1, "blocker_id", "u1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "blocked_id", "u2");
    expect(result).toBe("blocked_by_me");
  });

  it("returns 'none' when no block row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null }));

    await expect(getMyBlockStatus("u2")).resolves.toBe("none");
  });
});

describe("blockUser", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(blockUser("u2")).rejects.toThrow("Not signed in");
  });

  it("inserts a block row for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await blockUser("u2");

    expect(chain.insert).toHaveBeenCalledWith({ blocker_id: "u1", blocked_id: "u2" });
  });

  it("throws the Supabase error on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const err = { message: "duplicate key" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(blockUser("u2")).rejects.toBe(err);
  });
});

describe("unblockUser", () => {
  it("deletes the matching block row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await unblockUser("u2");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "blocker_id", "u1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "blocked_id", "u2");
  });
});

describe("getBlockedUsers", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getBlockedUsers()).rejects.toThrow("Not signed in");
  });

  it("returns an empty array without a second query when nobody is blocked", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getBlockedUsers();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("resolves blocked ids to profile rows", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const blocksChain = createChainableQueryMock({ data: [{ blocked_id: "u2" }, { blocked_id: "u3" }], error: null });
    const profilesChain = createChainableQueryMock({ data: [{ id: "u2" }, { id: "u3" }], error: null });
    mockSupabase.from.mockReturnValueOnce(blocksChain).mockReturnValueOnce(profilesChain);

    const result = await getBlockedUsers();

    expect(blocksChain.eq).toHaveBeenCalledWith("blocker_id", "u1");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["u2", "u3"]);
    expect(result).toEqual([{ id: "u2" }, { id: "u3" }]);
  });
});
