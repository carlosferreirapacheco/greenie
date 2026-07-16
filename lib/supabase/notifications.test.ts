jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead } from "./notifications";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getNotifications", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getNotifications()).rejects.toThrow("Not signed in");
  });

  it("hydrates actor info onto each notification, newest first", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });

    const rows = [
      {
        id: "n2",
        recipient_id: "me",
        actor_id: "u1",
        type: "like",
        progress_id: "pr1",
        read_at: null,
        created_at: "2026-07-16",
      },
      {
        id: "n1",
        recipient_id: "me",
        actor_id: "u2",
        type: "follow_request",
        progress_id: null,
        read_at: "2026-07-15",
        created_at: "2026-07-15",
      },
    ];

    const rowsChain = createChainableQueryMock({ data: rows, error: null });
    const actorsChain = createChainableQueryMock({
      data: [
        { id: "u1", display_name: "Ann", username: "ann", avatar_url: "https://example.com/a.jpg" },
        { id: "u2", display_name: null, username: "bob", avatar_url: null },
      ],
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(rowsChain).mockReturnValueOnce(actorsChain);

    const result = await getNotifications();

    expect(rowsChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rowsChain.limit).toHaveBeenCalledWith(50);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: "n2", actor_display_name: "Ann", actor_avatar_url: "https://example.com/a.jpg" })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({ id: "n1", actor_display_name: null, actor_username: "bob" })
    );
  });

  it("falls back to null actor fields when the actor's profile isn't visible (block asymmetry)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });

    const rows = [
      {
        id: "n1",
        recipient_id: "me",
        actor_id: "hidden",
        type: "comment",
        progress_id: "pr1",
        read_at: null,
        created_at: "2026-07-16",
      },
    ];

    mockSupabase.from
      .mockReturnValueOnce(createChainableQueryMock({ data: rows, error: null }))
      .mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getNotifications();

    expect(result[0].actor_display_name).toBeNull();
    expect(result[0].actor_username).toBeNull();
    expect(result[0].actor_avatar_url).toBeNull();
  });

  it("returns empty without an actor fetch when there are no notifications", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getNotifications();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });
});

describe("getUnreadNotificationCount", () => {
  it("counts only unread rows for the signed-in recipient", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });
    const chain = createChainableQueryMock({ data: null, error: null, count: 3 });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getUnreadNotificationCount();

    expect(chain.eq).toHaveBeenCalledWith("recipient_id", "me");
    expect(chain.is).toHaveBeenCalledWith("read_at", null);
    expect(result).toBe(3);
  });

  it("returns 0 when the count comes back null", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null, count: null }));

    await expect(getUnreadNotificationCount()).resolves.toBe(0);
  });
});

describe("markAllNotificationsRead", () => {
  it("stamps read_at on the signed-in recipient's unread rows only", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await markAllNotificationsRead();

    expect(chain.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith("recipient_id", "me");
    expect(chain.is).toHaveBeenCalledWith("read_at", null);
  });

  it("throws the Supabase error on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "me" } } });
    const err = { message: "permission denied" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(markAllNotificationsRead()).rejects.toBe(err);
  });
});
