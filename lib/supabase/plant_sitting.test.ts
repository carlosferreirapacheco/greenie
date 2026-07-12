jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import {
  requestPlantSitting,
  getMySittingRequests,
  getMySittingAssignments,
  getMySitters,
  getSittersHistory,
  sittingSortKey,
  formatSittingPeriod,
  acceptSittingRequest,
  declineSittingRequest,
  cancelSittingRequest,
  getMyActiveAssignmentOwnerIds,
  computeSittingAccessState,
} from "./plant_sitting";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("computeSittingAccessState", () => {
  const now = new Date("2026-07-15T00:00:00.000Z");

  it("passes through pending/declined/cancelled unchanged", () => {
    expect(computeSittingAccessState({ status: "pending", starts_at: null, ends_at: null }, now)).toBe("pending");
    expect(computeSittingAccessState({ status: "declined", starts_at: null, ends_at: null }, now)).toBe("declined");
    expect(computeSittingAccessState({ status: "cancelled", starts_at: null, ends_at: null }, now)).toBe("cancelled");
  });

  it("is 'active' for accepted with no date window", () => {
    expect(computeSittingAccessState({ status: "accepted", starts_at: null, ends_at: null }, now)).toBe("active");
  });

  it("is 'upcoming' when starts_at is in the future", () => {
    expect(
      computeSittingAccessState({ status: "accepted", starts_at: "2026-07-20T00:00:00.000Z", ends_at: null }, now)
    ).toBe("upcoming");
  });

  it("is 'active' once now is on or after starts_at", () => {
    expect(
      computeSittingAccessState({ status: "accepted", starts_at: "2026-07-15T00:00:00.000Z", ends_at: null }, now)
    ).toBe("active");
  });

  it("is 'ended' once now is after ends_at", () => {
    expect(
      computeSittingAccessState({ status: "accepted", starts_at: null, ends_at: "2026-07-10T00:00:00.000Z" }, now)
    ).toBe("ended");
  });

  it("is 'active' while within both bounds", () => {
    expect(
      computeSittingAccessState(
        { status: "accepted", starts_at: "2026-07-01T00:00:00.000Z", ends_at: "2026-07-31T00:00:00.000Z" },
        now
      )
    ).toBe("active");
  });
});

describe("requestPlantSitting", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(requestPlantSitting("sitter1", null, null)).rejects.toThrow("Not signed in");
  });

  it("inserts with owner_id from the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });
    const chain = createChainableQueryMock({ data: { id: "a1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await requestPlantSitting("sitter1", "2026-07-20", "2026-07-27");

    expect(chain.insert).toHaveBeenCalledWith({
      owner_id: "owner1",
      sitter_id: "sitter1",
      starts_at: "2026-07-20",
      ends_at: "2026-07-27",
    });
  });

  it("maps a 42501 RLS rejection to a friendly mutual-follow message", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: { code: "42501" } }));

    await expect(requestPlantSitting("sitter1", null, null)).rejects.toThrow(
      "You can only request plant-sitting from someone who follows you back."
    );
  });

  it("maps a 23505 unique violation to a friendly duplicate-request message", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: { code: "23505" } }));

    await expect(requestPlantSitting("sitter1", null, null)).rejects.toThrow(
      "There's already an open plant-sitting request with this person."
    );
  });
});

describe("getMySittingRequests", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getMySittingRequests()).rejects.toThrow("Not signed in");
  });

  it("queries pending assignments where I'm the sitter and hydrates the owner profile", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "sitter1" } } });
    const assignmentsChain = createChainableQueryMock({
      data: [{ id: "a1", owner_id: "owner1", sitter_id: "sitter1", status: "pending" }],
      error: null,
    });
    const profilesChain = createChainableQueryMock({
      data: [{ id: "owner1", display_name: "Owner One" }],
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(assignmentsChain).mockReturnValueOnce(profilesChain);

    const result = await getMySittingRequests();

    expect(assignmentsChain.eq).toHaveBeenNthCalledWith(1, "sitter_id", "sitter1");
    expect(assignmentsChain.eq).toHaveBeenNthCalledWith(2, "status", "pending");
    expect(profilesChain.in).toHaveBeenCalledWith("id", ["owner1"]);
    expect(result[0].owner).toEqual({ id: "owner1", display_name: "Owner One" });
  });

  it("returns an empty array without a profile lookup when there are no requests", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "sitter1" } } });
    mockSupabase.from.mockReturnValueOnce(createChainableQueryMock({ data: [], error: null }));

    const result = await getMySittingRequests();

    expect(result).toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });
});

describe("getMySittingAssignments", () => {
  it("queries accepted assignments where I'm the sitter", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "sitter1" } } });
    const assignmentsChain = createChainableQueryMock({
      data: [{ id: "a1", owner_id: "owner1", sitter_id: "sitter1", status: "accepted" }],
      error: null,
    });
    const profilesChain = createChainableQueryMock({ data: [{ id: "owner1" }], error: null });
    mockSupabase.from.mockReturnValueOnce(assignmentsChain).mockReturnValueOnce(profilesChain);

    await getMySittingAssignments();

    expect(assignmentsChain.eq).toHaveBeenNthCalledWith(1, "sitter_id", "sitter1");
    expect(assignmentsChain.eq).toHaveBeenNthCalledWith(2, "status", "accepted");
  });
});

describe("getMySitters", () => {
  it("queries pending/accepted assignments where I'm the owner and hydrates the sitter profile", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });
    const assignmentsChain = createChainableQueryMock({
      data: [{ id: "a1", owner_id: "owner1", sitter_id: "sitter1", status: "accepted" }],
      error: null,
    });
    const profilesChain = createChainableQueryMock({ data: [{ id: "sitter1", display_name: "Sitter One" }], error: null });
    mockSupabase.from.mockReturnValueOnce(assignmentsChain).mockReturnValueOnce(profilesChain);

    const result = await getMySitters();

    expect(assignmentsChain.eq).toHaveBeenCalledWith("owner_id", "owner1");
    expect(assignmentsChain.in).toHaveBeenCalledWith("status", ["pending", "accepted"]);
    expect(result[0].sitter).toEqual({ id: "sitter1", display_name: "Sitter One" });
  });
});

describe("sittingSortKey", () => {
  it("uses starts_at when set", () => {
    expect(sittingSortKey({ starts_at: "2026-08-01", created_at: "2026-01-01" })).toBe("2026-08-01");
  });

  it("falls back to created_at when starts_at is null", () => {
    expect(sittingSortKey({ starts_at: null, created_at: "2026-01-01" })).toBe("2026-01-01");
  });
});

describe("getSittersHistory", () => {
  it("queries declined/cancelled assignments where I'm the owner", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });
    const assignmentsChain = createChainableQueryMock({ data: [], error: null });
    mockSupabase.from.mockReturnValueOnce(assignmentsChain);

    await getSittersHistory();

    expect(assignmentsChain.eq).toHaveBeenCalledWith("owner_id", "owner1");
    expect(assignmentsChain.in).toHaveBeenCalledWith("status", ["declined", "cancelled"]);
  });

  it("sorts by sittingSortKey descending (starts_at, falling back to created_at)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "owner1" } } });
    const assignmentsChain = createChainableQueryMock({
      data: [
        { id: "no-period", owner_id: "owner1", sitter_id: "s1", status: "cancelled", starts_at: null, created_at: "2026-02-01" },
        { id: "earliest", owner_id: "owner1", sitter_id: "s2", status: "declined", starts_at: "2026-01-01", created_at: "2025-12-01" },
        { id: "latest", owner_id: "owner1", sitter_id: "s3", status: "cancelled", starts_at: "2026-06-01", created_at: "2025-11-01" },
      ],
      error: null,
    });
    const profilesChain = createChainableQueryMock({
      data: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(assignmentsChain).mockReturnValueOnce(profilesChain);

    const result = await getSittersHistory();

    expect(result.map((a) => a.id)).toEqual(["latest", "no-period", "earliest"]);
  });
});

describe("formatSittingPeriod", () => {
  it("returns null when neither date is set", () => {
    expect(formatSittingPeriod(null, null)).toBeNull();
  });

  it("formats a range when both dates are set", () => {
    const result = formatSittingPeriod("2026-07-20T00:00:00.000Z", "2026-07-27T00:00:00.000Z");
    expect(result).toContain(" – ");
    expect(result?.indexOf(" – ")).toBeGreaterThan(0);
  });

  it("formats a start-only period", () => {
    expect(formatSittingPeriod("2026-07-20T00:00:00.000Z", null)).toMatch(/^From /);
  });

  it("formats an end-only period", () => {
    expect(formatSittingPeriod(null, "2026-07-27T00:00:00.000Z")).toMatch(/^Until /);
  });
});

describe("acceptSittingRequest / declineSittingRequest / cancelSittingRequest", () => {
  it("acceptSittingRequest updates status to accepted with a responded_at stamp", async () => {
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await acceptSittingRequest("a1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "accepted" }));
    expect(chain.eq).toHaveBeenCalledWith("id", "a1");
  });

  it("declineSittingRequest updates status to declined", async () => {
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await declineSittingRequest("a1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "declined" }));
  });

  it("cancelSittingRequest updates status to cancelled with a cancelled_at stamp", async () => {
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await cancelSittingRequest("a1");

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelled" }));
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "permission denied" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(acceptSittingRequest("a1")).rejects.toBe(err);
  });
});

describe("getMyActiveAssignmentOwnerIds", () => {
  it("filters accepted assignments down to ones currently within their date window", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "sitter1" } } });
    const chain = createChainableQueryMock({
      data: [
        { owner_id: "owner-active", status: "accepted", starts_at: null, ends_at: null },
        { owner_id: "owner-upcoming", status: "accepted", starts_at: "2999-01-01T00:00:00.000Z", ends_at: null },
        { owner_id: "owner-ended", status: "accepted", starts_at: null, ends_at: "2000-01-01T00:00:00.000Z" },
      ],
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getMyActiveAssignmentOwnerIds();

    expect(result).toEqual(["owner-active"]);
  });
});
