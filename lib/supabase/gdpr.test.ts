jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { collectMyData } from "./gdpr";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

const profileRow = {
  id: "u1",
  username: "carlos",
  username_changed_at: null,
  accepted_privacy_at: "2026-07-01T00:00:00Z",
  display_name: "Carlos",
  bio: "Hi",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
  profile_visibility: "public",
  follow_policy: "open",
  progress_visibility: "public",
};

describe("collectMyData", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(collectMyData()).rejects.toThrow("Not signed in");
  });

  it("assembles every section scoped to the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });

    // Call order (see gdpr.ts): profile -> plants -> care_tasks ->
    // progress -> comments -> likes -> follows -> blocks ->
    // notifications.
    const profileChain = createChainableQueryMock({ data: profileRow, error: null });
    const plantsChain = createChainableQueryMock({ data: [{ id: "pl1", name: "Pothos" }], error: null });
    const careTasksChain = createChainableQueryMock({ data: [{ id: "ct1", plant_id: "pl1" }], error: null });
    const progressChain = createChainableQueryMock({ data: [{ id: "pr1" }], error: null });
    const commentsChain = createChainableQueryMock({ data: [{ id: "c1" }], error: null });
    const likesChain = createChainableQueryMock({ data: [{ progress_id: "pr9" }], error: null });
    const followsChain = createChainableQueryMock({
      data: [
        { follower_id: "u1", followee_id: "u2" },
        { follower_id: "u3", followee_id: "u1" },
      ],
      error: null,
    });
    const blocksChain = createChainableQueryMock({ data: [{ blocker_id: "u1", blocked_id: "u4" }], error: null });
    const notificationsChain = createChainableQueryMock({
      data: [{ id: "n1", recipient_id: "u1", type: "like" }],
      error: null,
    });
    const pushTokensChain = createChainableQueryMock({
      data: [{ token: "ExponentPushToken[abc]", user_id: "u1", platform: "android" }],
      error: null,
    });
    mockSupabase.from
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(plantsChain)
      .mockReturnValueOnce(careTasksChain)
      .mockReturnValueOnce(progressChain)
      .mockReturnValueOnce(commentsChain)
      .mockReturnValueOnce(likesChain)
      .mockReturnValueOnce(followsChain)
      .mockReturnValueOnce(blocksChain)
      .mockReturnValueOnce(notificationsChain)
      .mockReturnValueOnce(pushTokensChain);

    const result = await collectMyData();

    expect(plantsChain.eq).toHaveBeenCalledWith("owner_id", "u1");
    expect(careTasksChain.in).toHaveBeenCalledWith("plant_id", ["pl1"]);
    expect(progressChain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(commentsChain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(likesChain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(followsChain.or).toHaveBeenCalledWith("follower_id.eq.u1,followee_id.eq.u1");
    expect(blocksChain.eq).toHaveBeenCalledWith("blocker_id", "u1");
    expect(notificationsChain.eq).toHaveBeenCalledWith("recipient_id", "u1");
    expect(pushTokensChain.eq).toHaveBeenCalledWith("user_id", "u1");

    expect(result.account).toEqual(
      expect.objectContaining({ id: "u1", email: "a@b.com", username: "carlos", accepted_privacy_at: "2026-07-01T00:00:00Z" })
    );
    expect(result.plants).toEqual([{ id: "pl1", name: "Pothos" }]);
    expect(result.care_tasks).toEqual([{ id: "ct1", plant_id: "pl1" }]);
    expect(result.progress_reports).toEqual([{ id: "pr1" }]);
    expect(result.comments).toEqual([{ id: "c1" }]);
    expect(result.likes).toEqual([{ progress_id: "pr9" }]);
    expect(result.follows.following).toEqual([{ follower_id: "u1", followee_id: "u2" }]);
    expect(result.follows.followers).toEqual([{ follower_id: "u3", followee_id: "u1" }]);
    expect(result.blocks).toEqual([{ blocker_id: "u1", blocked_id: "u4" }]);
    expect(result.notifications).toEqual([{ id: "n1", recipient_id: "u1", type: "like" }]);
    expect(result.push_tokens).toEqual([
      { token: "ExponentPushToken[abc]", user_id: "u1", platform: "android" },
    ]);
    expect(typeof result.exported_at).toBe("string");
  });

  it("skips the care_tasks query entirely when there are no plants", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });

    const profileChain = createChainableQueryMock({ data: profileRow, error: null });
    const emptyChain = () => createChainableQueryMock({ data: [], error: null });
    mockSupabase.from
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(emptyChain()) // plants
      .mockReturnValueOnce(emptyChain()) // progress
      .mockReturnValueOnce(emptyChain()) // comments
      .mockReturnValueOnce(emptyChain()) // likes
      .mockReturnValueOnce(emptyChain()) // follows
      .mockReturnValueOnce(emptyChain()) // blocks
      .mockReturnValueOnce(emptyChain()) // notifications
      .mockReturnValueOnce(emptyChain()); // push_tokens

    const result = await collectMyData();

    // profile + plants + progress + comments + likes + follows + blocks
    // + notifications = 8 -- no care_tasks call in between.
    expect(mockSupabase.from).toHaveBeenCalledTimes(9);
    expect(mockSupabase.from).not.toHaveBeenCalledWith("care_tasks");
    expect(result.care_tasks).toEqual([]);
    expect(result.blocks).toEqual([]);
  });
});
