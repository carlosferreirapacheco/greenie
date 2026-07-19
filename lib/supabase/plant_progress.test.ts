jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import {
  getFeed,
  getProgressReport,
  createProgressReport,
  updateProgressReportSettings,
  getProgressReportsForPlant,
  effectiveCommentPolicy,
} from "./plant_progress";
import { getFollowing } from "./follows";

jest.mock("./follows", () => ({ getFollowing: jest.fn() }));

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getProgressReport", () => {
  it("aggregates likes, comments, and plant nickname mapping onto a single report", async () => {
    const report = {
      id: "pr1",
      plant_id: "pl1",
      user_id: "author1",
      height_cm: 30,
      notes: "Growing well",
      photo_url: null,
      created_at: "2026-01-01",
      comment_policy: "followers",
      shared_to_feed: true,
    };

    // Call order (see plant_progress.ts): report -> author -> auth.getUser
    // -> plants -> owner profiles (always fetched fresh now, for
    // plant_sitter_attribution -- not reused from the author cache even
    // though owner === author here) -> likes -> comments ->
    // comment-authors.
    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: report, error: null }))
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: { display_name: "Carlos", username: "carlos" },
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [
            {
              id: "pl1",
              name: "Pothos",
              species: "Epipremnum aureum",
              nickname: "Big Fred",
              owner_id: "author1",
              photo_urls: ["https://example.com/plant.jpg"],
            },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [{ id: "author1", display_name: "Carlos", username: "carlos", plant_sitter_attribution: "allowed" }],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [
            { progress_id: "pr1", user_id: "viewer1" },
            { progress_id: "pr1", user_id: "other-user" },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [
            { id: "c2", progress_id: "pr1", user_id: "u2", content: "newest", created_at: "2026-01-03" },
            { id: "c1", progress_id: "pr1", user_id: "u1", content: "older", created_at: "2026-01-02" },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [
            { id: "u1", display_name: "Ann" },
            { id: "u2", display_name: "Bob" },
          ],
          error: null,
        })
      );

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "viewer1" } } });

    const result = await getProgressReport("pr1");

    expect(result.plant_name).toBe("Pothos");
    expect(result.plant_nickname).toBe("Big Fred");
    expect(result.plant_species).toBe("Epipremnum aureum");
    expect(result.author_display_name).toBe("Carlos");
    expect(result.author_username).toBe("carlos");
    expect(result.plant_owner_id).toBe("author1");
    expect(result.plant_owner_display_name).toBe("Carlos");
    expect(result.plant_owner_username).toBe("carlos");
    expect(result.plant_owner_share_allowed).toBe(true);
    expect(result.plant_photo_url).toBe("https://example.com/plant.jpg");
    // The report's own per-report settings ride through untouched.
    expect(result.comment_policy).toBe("followers");
    expect(result.shared_to_feed).toBe(true);
    expect(result.like_count).toBe(2);
    expect(result.liked_by_me).toBe(true);
    expect(result.comment_count).toBe(2);
    expect(result.latest_comment).toEqual(
      expect.objectContaining({ id: "c2", content: "newest", author_display_name: "Bob" })
    );
  });

  it("carries the author's and plant owner's avatar_url onto the hydrated report", async () => {
    const report = {
      id: "pr4",
      plant_id: "pl1",
      user_id: "author1",
      height_cm: null,
      notes: "Notes",
      photo_url: null,
      created_at: "2026-01-01",
      comment_policy: "public",
      shared_to_feed: true,
    };

    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: report, error: null }))
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: { display_name: "Carlos", username: "carlos", avatar_url: "https://example.com/a.jpg" },
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [{ id: "pl1", name: "Pothos", species: null, nickname: null, owner_id: "author1" }],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [
            {
              id: "author1",
              display_name: "Carlos",
              username: "carlos",
              avatar_url: "https://example.com/a.jpg",
              plant_sitter_attribution: "allowed",
            },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "viewer1" } } });

    const result = await getProgressReport("pr4");

    expect(result.author_avatar_url).toBe("https://example.com/a.jpg");
  });

  it("fetches the owner's profile separately when the report's author isn't the plant's owner (plant-sitting)", async () => {
    const report = {
      id: "pr3",
      plant_id: "pl1",
      user_id: "sitter1",
      height_cm: 20,
      notes: "Watered while owner was away",
      photo_url: null,
      created_at: "2026-01-01",
      comment_policy: "public",
      shared_to_feed: true,
    };

    // Call order: report -> author (the sitter) -> auth.getUser -> plants
    // -> owner profiles -> likes -> comments.
    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: report, error: null }))
      .mockReturnValueOnce(
        createChainableQueryMock({ data: { display_name: "Sammy", username: "sammy" }, error: null })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [{ id: "pl1", name: "Pothos", species: "Epipremnum aureum", nickname: null, owner_id: "owner1" }],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [{ id: "owner1", display_name: "Carlos", username: "carlos", plant_sitter_attribution: "disabled" }],
          error: null,
        })
      )
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });

    const result = await getProgressReport("pr3");

    expect(result.author_display_name).toBe("Sammy");
    expect(result.plant_owner_id).toBe("owner1");
    expect(result.plant_owner_display_name).toBe("Carlos");
    expect(result.plant_owner_username).toBe("carlos");
    // The owner's plant_sitter_attribution feeds plant_owner_share_allowed,
    // used to gate the sitter's Feed toggle on app/progress/[id].tsx.
    expect(result.plant_owner_share_allowed).toBe(false);
  });

  it("falls back to 'Unknown plant' and no counts when the plant and engagement are missing", async () => {
    const report = {
      id: "pr2",
      plant_id: "deleted-plant",
      user_id: "author1",
      height_cm: null,
      notes: "Notes",
      photo_url: null,
      created_at: "2026-01-01",
    };

    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: report, error: null }))
      .mockReturnValueOnce(createChainableQueryMock({ data: { display_name: "Carlos" }, error: null }))
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })) // no matching plant
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })) // no likes
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })); // no comments

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "viewer1" } } });

    const result = await getProgressReport("pr2");

    expect(result.plant_name).toBe("Unknown plant");
    expect(result.plant_nickname).toBeNull();
    expect(result.plant_species).toBeNull();
    expect(result.like_count).toBe(0);
    expect(result.liked_by_me).toBe(false);
    expect(result.comment_count).toBe(0);
    expect(result.latest_comment).toBeNull();
    // No plant resolved -> no owner to fetch -> fails open.
    expect(result.plant_owner_share_allowed).toBe(true);
    expect(result.plant_photo_url).toBeNull();
  });
});

describe("createProgressReport", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      createProgressReport({ plant_id: "pl1", height_cm: 10, notes: "n", comment_policy: "public", shared_to_feed: true })
    ).rejects.toThrow("Not signed in");
  });

  it("inserts with user_id from the signed-in user and the per-report settings", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { id: "pr1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await createProgressReport({
      plant_id: "pl1",
      height_cm: 10,
      notes: "Growing",
      comment_policy: "disabled",
      shared_to_feed: false,
    });

    expect(chain.insert).toHaveBeenCalledWith({
      plant_id: "pl1",
      user_id: "u1",
      height_cm: 10,
      notes: "Growing",
      comment_policy: "disabled",
      shared_to_feed: false,
      photo_url: null,
    });
  });

  it("passes through a provided photo_url", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { id: "pr1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await createProgressReport({
      plant_id: "pl1",
      height_cm: 10,
      notes: "Growing",
      comment_policy: "public",
      shared_to_feed: true,
      photo_url: "https://example.com/photos/u1/progress/x.jpg",
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ photo_url: "https://example.com/photos/u1/progress/x.jpg" })
    );
  });

  it("maps a 42501 rejection to a friendly share-gate message", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSupabase.from.mockReturnValue(
      createChainableQueryMock({ data: null, error: { code: "42501", message: "new row violates row-level security policy" } })
    );

    await expect(
      createProgressReport({ plant_id: "pl1", height_cm: 10, notes: "n", comment_policy: "public", shared_to_feed: true })
    ).rejects.toThrow("doesn't allow sitters to share reports");
  });
});

describe("getFeed", () => {
  it("only fetches reports shared to the feed", async () => {
    (getFollowing as jest.Mock).mockResolvedValue([{ id: "person1", display_name: "Ann", username: "ann" }]);
    const reportsChain = createChainableQueryMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue(reportsChain);

    const result = await getFeed();

    expect(reportsChain.eq).toHaveBeenCalledWith("shared_to_feed", true);
    expect(reportsChain.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("returns empty without querying when following nobody", async () => {
    (getFollowing as jest.Mock).mockResolvedValue([]);

    const result = await getFeed();

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("does not filter by created_at when no cursor is given", async () => {
    (getFollowing as jest.Mock).mockResolvedValue([{ id: "person1", display_name: "Ann", username: "ann" }]);
    const reportsChain = createChainableQueryMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue(reportsChain);

    await getFeed();

    expect(reportsChain.lt).not.toHaveBeenCalled();
  });

  it("filters by created_at when a cursor is given", async () => {
    (getFollowing as jest.Mock).mockResolvedValue([{ id: "person1", display_name: "Ann", username: "ann" }]);
    const reportsChain = createChainableQueryMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue(reportsChain);

    await getFeed({ before: "2026-07-01T00:00:00Z" });

    expect(reportsChain.lt).toHaveBeenCalledWith("created_at", "2026-07-01T00:00:00Z");
  });

  it("returns a null nextCursor when fewer than a full page comes back", async () => {
    (getFollowing as jest.Mock).mockResolvedValue([{ id: "person1", display_name: "Ann", username: "ann" }]);
    const reports = Array.from({ length: 5 }, (_, i) => ({
      id: `pr${i}`,
      plant_id: "pl1",
      user_id: "person1",
      created_at: `2026-07-0${i + 1}T00:00:00Z`,
    }));
    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: reports, error: null })) // plant_progress
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })) // plants
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })) // likes
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })); // comments
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getFeed();

    expect(result.nextCursor).toBeNull();
    expect(result.items).toHaveLength(5);
  });

  it("returns the last row's created_at as nextCursor when a full page comes back", async () => {
    (getFollowing as jest.Mock).mockResolvedValue([{ id: "person1", display_name: "Ann", username: "ann" }]);
    const reports = Array.from({ length: 20 }, (_, i) => ({
      id: `pr${i}`,
      plant_id: "pl1",
      user_id: "person1",
      created_at: `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: reports, error: null })) // plant_progress
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })) // plants
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })) // likes
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null })); // comments
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getFeed();

    expect(result.nextCursor).toBe(reports[19].created_at);
  });
});

describe("updateProgressReportSettings", () => {
  it("updates the targeted report's settings", async () => {
    const chain = createChainableQueryMock({
      data: { id: "pr1", comment_policy: "disabled", shared_to_feed: false },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await updateProgressReportSettings("pr1", { comment_policy: "disabled", shared_to_feed: false });

    expect(chain.update).toHaveBeenCalledWith({ comment_policy: "disabled", shared_to_feed: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "pr1");
    expect(result.comment_policy).toBe("disabled");
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "permission denied" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(updateProgressReportSettings("pr1", { comment_policy: "public", shared_to_feed: true })).rejects.toBe(
      err
    );
  });

  it("maps a 42501 rejection to a friendly share-gate message", async () => {
    mockSupabase.from.mockReturnValue(
      createChainableQueryMock({ data: null, error: { code: "42501", message: "new row violates row-level security policy" } })
    );

    await expect(
      updateProgressReportSettings("pr1", { comment_policy: "public", shared_to_feed: true })
    ).rejects.toThrow("doesn't allow sitters to share reports");
  });
});

describe("getProgressReportsForPlant", () => {
  it("queries by plant_id, newest first, without filtering shared_to_feed", async () => {
    const chain = createChainableQueryMock({
      data: [{ id: "pr2" }, { id: "pr1" }],
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getProgressReportsForPlant("pl1");

    expect(chain.eq).toHaveBeenCalledWith("plant_id", "pl1");
    // Guards against a future regression silently hiding unlisted
    // reports here -- this is the one place they must surface.
    expect(chain.eq).not.toHaveBeenCalledWith("shared_to_feed", expect.anything());
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "pr2" }, { id: "pr1" }]);
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "network error" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(getProgressReportsForPlant("pl1")).rejects.toBe(err);
  });
});

describe("effectiveCommentPolicy", () => {
  it("passes the comment policy through unchanged when shared to the feed", () => {
    expect(effectiveCommentPolicy(true, "public")).toBe("public");
    expect(effectiveCommentPolicy(true, "followers")).toBe("followers");
    expect(effectiveCommentPolicy(true, "disabled")).toBe("disabled");
  });

  it("forces disabled when unlisted, regardless of the picked policy", () => {
    expect(effectiveCommentPolicy(false, "public")).toBe("disabled");
    expect(effectiveCommentPolicy(false, "followers")).toBe("disabled");
    expect(effectiveCommentPolicy(false, "disabled")).toBe("disabled");
  });
});
