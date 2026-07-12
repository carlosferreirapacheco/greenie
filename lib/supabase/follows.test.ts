jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import {
  getFollowing,
  getFollowers,
  getMutualFollowers,
  getFollowStatus,
  amIFollowedBy,
  followUser,
  unfollowUser,
  getPendingFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  removeFollower,
} from "./follows";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getFollowing", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getFollowing()).rejects.toThrow("Not signed in");
  });

  it("returns an empty array without a second query when following no one", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getFollowing();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("only counts accepted follows, not pending outgoing requests", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const followChain = createChainableQueryMock({ data: [{ followee_id: "u2" }, { followee_id: "u3" }], error: null });
    const profilesChain = createChainableQueryMock({ data: [{ id: "u2" }, { id: "u3" }], error: null });
    mockSupabase.from.mockReturnValueOnce(followChain).mockReturnValueOnce(profilesChain);

    const result = await getFollowing();

    expect(followChain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u1");
    expect(followChain.eq).toHaveBeenNthCalledWith(2, "status", "accepted");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["u2", "u3"]);
    expect(result).toEqual([{ id: "u2" }, { id: "u3" }]);
  });
});

describe("getFollowers", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getFollowers()).rejects.toThrow("Not signed in");
  });

  it("returns an empty array without a second query when nobody follows me", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getFollowers();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("resolves accepted followers of the signed-in user to profile rows", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const followChain = createChainableQueryMock({ data: [{ follower_id: "u2" }, { follower_id: "u3" }], error: null });
    const profilesChain = createChainableQueryMock({ data: [{ id: "u2" }, { id: "u3" }], error: null });
    mockSupabase.from.mockReturnValueOnce(followChain).mockReturnValueOnce(profilesChain);

    const result = await getFollowers();

    expect(followChain.eq).toHaveBeenNthCalledWith(1, "followee_id", "u1");
    expect(followChain.eq).toHaveBeenNthCalledWith(2, "status", "accepted");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["u2", "u3"]);
    expect(result).toEqual([{ id: "u2" }, { id: "u3" }]);
  });
});

describe("getMutualFollowers", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getMutualFollowers()).rejects.toThrow("Not signed in");
  });

  it("returns an empty array without a profile query when there's no overlap", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const followingChain = createChainableQueryMock({ data: [{ followee_id: "a" }], error: null });
    const followersChain = createChainableQueryMock({ data: [{ follower_id: "d" }], error: null });
    mockSupabase.from.mockReturnValueOnce(followingChain).mockReturnValueOnce(followersChain);

    const result = await getMutualFollowers();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });

  it("intersects who I follow with who follows me, and resolves the overlap to profiles", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const followingChain = createChainableQueryMock({
      data: [{ followee_id: "a" }, { followee_id: "b" }, { followee_id: "c" }],
      error: null,
    });
    const followersChain = createChainableQueryMock({
      data: [{ follower_id: "b" }, { follower_id: "c" }, { follower_id: "d" }],
      error: null,
    });
    const profilesChain = createChainableQueryMock({ data: [{ id: "b" }, { id: "c" }], error: null });
    mockSupabase.from
      .mockReturnValueOnce(followingChain)
      .mockReturnValueOnce(followersChain)
      .mockReturnValueOnce(profilesChain);

    const result = await getMutualFollowers();

    expect(followingChain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u1");
    expect(followingChain.eq).toHaveBeenNthCalledWith(2, "status", "accepted");
    expect(followersChain.eq).toHaveBeenNthCalledWith(1, "followee_id", "u1");
    expect(followersChain.eq).toHaveBeenNthCalledWith(2, "status", "accepted");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["b", "c"]);
    expect(result).toEqual([{ id: "b" }, { id: "c" }]);
  });
});

describe("removeFollower", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(removeFollower("u2")).rejects.toThrow("Not signed in");
  });

  it("deletes the row where the given user follows me", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await removeFollower("u2");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u2");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "followee_id", "u1");
  });

  it("throws the Supabase error on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const err = { message: "permission denied" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(removeFollower("u2")).rejects.toBe(err);
  });
});

describe("getFollowStatus", () => {
  it("returns 'accepted' when an accepted follow row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { status: "accepted" }, error: null }));

    await expect(getFollowStatus("u2")).resolves.toBe("accepted");
  });

  it("returns 'pending' when a pending follow row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { status: "pending" }, error: null }));

    await expect(getFollowStatus("u2")).resolves.toBe("pending");
  });

  it("returns 'none' when no follow row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null }));

    await expect(getFollowStatus("u2")).resolves.toBe("none");
  });
});

describe("amIFollowedBy", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(amIFollowedBy("u2")).rejects.toThrow("Not signed in");
  });

  it("queries the reverse direction from getFollowStatus (userId -> me)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { status: "accepted" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await amIFollowedBy("u2");

    expect(chain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u2");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "followee_id", "u1");
  });

  it("returns true when u2 accepted-follows me", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { status: "accepted" }, error: null }));

    await expect(amIFollowedBy("u2")).resolves.toBe(true);
  });

  it("returns false when the follow is only pending", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { status: "pending" }, error: null }));

    await expect(amIFollowedBy("u2")).resolves.toBe(false);
  });

  it("returns false when no follow row exists", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null }));

    await expect(amIFollowedBy("u2")).resolves.toBe(false);
  });
});

describe("followUser", () => {
  it("inserts a follow row for the signed-in user and returns the server-assigned status", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    // status isn't supplied by the client -- a DB trigger assigns it based
    // on the target's follow_policy, so the mock simulates that by
    // returning it on the inserted row regardless of what was sent.
    const chain = createChainableQueryMock({ data: { status: "pending" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await followUser("u2");

    expect(chain.insert).toHaveBeenCalledWith({ follower_id: "u1", followee_id: "u2" });
    expect(result).toEqual({ status: "pending" });
  });

  it("maps an RLS rejection (42501, e.g. a block between the two accounts) to a friendly message", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const err = { code: "42501", message: "new row violates row-level security policy" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(followUser("u2")).rejects.toThrow("You can't follow this account.");
  });

  it("throws other Supabase errors unchanged", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const err = { code: "23505", message: "duplicate key" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(followUser("u2")).rejects.toBe(err);
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

describe("getPendingFollowRequests", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getPendingFollowRequests()).rejects.toThrow("Not signed in");
  });

  it("returns an empty array without a second query when there are no pending requests", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getPendingFollowRequests();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it("resolves pending requesters to profile rows", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const pendingChain = createChainableQueryMock({ data: [{ follower_id: "u2" }], error: null });
    const profilesChain = createChainableQueryMock({ data: [{ id: "u2", display_name: "Sammy" }], error: null });
    mockSupabase.from.mockReturnValueOnce(pendingChain).mockReturnValueOnce(profilesChain);

    const result = await getPendingFollowRequests();

    expect(pendingChain.eq).toHaveBeenNthCalledWith(1, "followee_id", "u1");
    expect(pendingChain.eq).toHaveBeenNthCalledWith(2, "status", "pending");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["u2"]);
    expect(result).toEqual([{ id: "u2", display_name: "Sammy" }]);
  });
});

describe("acceptFollowRequest", () => {
  it("updates the matching row to accepted", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await acceptFollowRequest("u2");

    expect(chain.update).toHaveBeenCalledWith({ status: "accepted" });
    expect(chain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u2");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "followee_id", "u1");
  });
});

describe("declineFollowRequest", () => {
  it("deletes the matching pending row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await declineFollowRequest("u2");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "follower_id", "u2");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "followee_id", "u1");
  });
});
