jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getFriends, isFollowing, followUser, unfollowUser } from "./follows";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getFriends", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getFriends()).rejects.toThrow("Not signed in");
  });

  it("returns an empty array without a second query when following no one", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getFriends();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("resolves followee ids to profile rows", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const followChain = createChainableQueryMock({ data: [{ followee_id: "u2" }, { followee_id: "u3" }], error: null });
    const profilesChain = createChainableQueryMock({ data: [{ id: "u2" }, { id: "u3" }], error: null });
    mockSupabase.from.mockReturnValueOnce(followChain).mockReturnValueOnce(profilesChain);

    const result = await getFriends();

    expect(followChain.eq).toHaveBeenCalledWith("follower_id", "u1");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["u2", "u3"]);
    expect(result).toEqual([{ id: "u2" }, { id: "u3" }]);
  });
});

describe("isFollowing", () => {
  it("returns true when a follow row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { followee_id: "u2" }, error: null }));

    await expect(isFollowing("u2")).resolves.toBe(true);
  });

  it("returns false when no follow row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null }));

    await expect(isFollowing("u2")).resolves.toBe(false);
  });
});

describe("followUser", () => {
  it("inserts a follow row for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await followUser("u2");

    expect(chain.insert).toHaveBeenCalledWith({ follower_id: "u1", followee_id: "u2" });
  });
});

describe("unfollowUser", () => {
  it("deletes the matching follow row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await unfollowUser("u2");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "followee_id", "u2");
  });
});
