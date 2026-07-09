jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getProgressReport, createProgressReport } from "./plant_progress";

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
    };

    // Call order (see plant_progress.ts): report -> author -> auth.getUser
    // -> plants -> likes -> comments -> comment-authors.
    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: report, error: null }))
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: { display_name: "Carlos", username: "carlos", comment_policy: "followers" },
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChainableQueryMock({
          data: [{ id: "pl1", name: "Pothos", species: "Epipremnum aureum", nickname: "Big Fred" }],
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
    expect(result.author_comment_policy).toBe("followers");
    expect(result.like_count).toBe(2);
    expect(result.liked_by_me).toBe(true);
    expect(result.comment_count).toBe(2);
    expect(result.latest_comment).toEqual(
      expect.objectContaining({ id: "c2", content: "newest", author_display_name: "Bob" })
    );
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
  });
});

describe("createProgressReport", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(createProgressReport({ plant_id: "pl1", height_cm: 10, notes: "n" })).rejects.toThrow(
      "Not signed in"
    );
  });

  it("inserts with user_id from the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { id: "pr1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await createProgressReport({ plant_id: "pl1", height_cm: 10, notes: "Growing" });

    expect(chain.insert).toHaveBeenCalledWith({ plant_id: "pl1", user_id: "u1", height_cm: 10, notes: "Growing" });
  });
});
