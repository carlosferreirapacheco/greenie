jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getCommentsForProgress, getCommentsForProgressIds, addComment } from "./comments";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getCommentsForProgress", () => {
  it("hydrates each comment with its author's display name", async () => {
    const commentsChain = createChainableQueryMock({
      data: [{ id: "c1", progress_id: "p1", user_id: "u1", content: "Nice!", created_at: "2026-01-01" }],
      error: null,
    });
    const authorsChain = createChainableQueryMock({ data: [{ id: "u1", display_name: "Sammy" }], error: null });
    mockSupabase.from.mockReturnValueOnce(commentsChain).mockReturnValueOnce(authorsChain);

    const result = await getCommentsForProgress("p1");

    expect(commentsChain.eq).toHaveBeenCalledWith("progress_id", "p1");
    expect(result).toEqual([
      { id: "c1", progress_id: "p1", user_id: "u1", content: "Nice!", created_at: "2026-01-01", author_display_name: "Sammy" },
    ]);
  });

  it("falls back to null when the author has no matching profile", async () => {
    const commentsChain = createChainableQueryMock({
      data: [{ id: "c1", progress_id: "p1", user_id: "ghost", content: "Hi", created_at: "2026-01-01" }],
      error: null,
    });
    const authorsChain = createChainableQueryMock({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(commentsChain).mockReturnValueOnce(authorsChain);

    const result = await getCommentsForProgress("p1");

    expect(result[0].author_display_name).toBeNull();
  });

  it("returns an empty array without an author lookup when there are no comments", async () => {
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getCommentsForProgress("p1");

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });
});

describe("getCommentsForProgressIds", () => {
  it("returns an empty array without querying for an empty id list", async () => {
    const result = await getCommentsForProgressIds([]);
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("dedupes author lookups across multiple comments from the same user", async () => {
    const commentsChain = createChainableQueryMock({
      data: [
        { id: "c1", progress_id: "p1", user_id: "u1", content: "a", created_at: "2026-01-02" },
        { id: "c2", progress_id: "p1", user_id: "u1", content: "b", created_at: "2026-01-01" },
      ],
      error: null,
    });
    const authorsChain = createChainableQueryMock({ data: [{ id: "u1", display_name: "Sammy" }], error: null });
    mockSupabase.from.mockReturnValueOnce(commentsChain).mockReturnValueOnce(authorsChain);

    await getCommentsForProgressIds(["p1"]);

    expect(authorsChain.in).toHaveBeenCalledWith("id", ["u1"]);
  });
});

describe("addComment", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(addComment("p1", "hi")).rejects.toThrow("Not signed in");
  });

  it("inserts the comment then hydrates it with the author's own display name", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const insertChain = createChainableQueryMock({
      data: { id: "c1", progress_id: "p1", user_id: "u1", content: "hi", created_at: "2026-01-01" },
      error: null,
    });
    const authorsChain = createChainableQueryMock({ data: [{ id: "u1", display_name: "Carlos" }], error: null });
    mockSupabase.from.mockReturnValueOnce(insertChain).mockReturnValueOnce(authorsChain);

    const result = await addComment("p1", "hi");

    expect(insertChain.insert).toHaveBeenCalledWith({ progress_id: "p1", user_id: "u1", content: "hi" });
    expect(result.author_display_name).toBe("Carlos");
  });
});
