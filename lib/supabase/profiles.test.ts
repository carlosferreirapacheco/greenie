jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getMyProfile, getProfile, searchProfiles, updateMyProfile } from "./profiles";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMyProfile", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getMyProfile()).rejects.toThrow("Not signed in");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("merges the auth email onto the profile row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    const chain = createChainableQueryMock({ data: { id: "u1", display_name: "Carlos", bio: null }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getMyProfile();

    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
    expect(result).toEqual({ id: "u1", display_name: "Carlos", bio: null, email: "a@b.com" });
  });

  it("falls back to a null email when the auth user has none", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: undefined } } });
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: { id: "u1" }, error: null }));

    const result = await getMyProfile();

    expect(result.email).toBeNull();
  });
});

describe("getProfile", () => {
  it("fetches a profile by id, no session required", async () => {
    const chain = createChainableQueryMock({ data: { id: "u2", display_name: "Sammy" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getProfile("u2");

    expect(chain.eq).toHaveBeenCalledWith("id", "u2");
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "u2", display_name: "Sammy" });
  });
});

describe("searchProfiles", () => {
  it("returns an empty array without querying for a blank query", async () => {
    const result = await searchProfiles("   ");
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(searchProfiles("sam")).rejects.toThrow("Not signed in");
  });

  it("searches by display_name, excluding the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: [{ id: "u2", display_name: "Sammy" }], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await searchProfiles("  sam  ");

    expect(chain.ilike).toHaveBeenCalledWith("display_name", "%sam%");
    expect(chain.neq).toHaveBeenCalledWith("id", "u1");
    expect(result).toEqual([{ id: "u2", display_name: "Sammy" }]);
  });
});

describe("updateMyProfile", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(updateMyProfile({ display_name: "Carlos", bio: null })).rejects.toThrow("Not signed in");
  });

  it("updates display_name and bio for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { id: "u1", display_name: "Carlos", bio: "Hi" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await updateMyProfile({ display_name: "Carlos", bio: "Hi" });

    expect(chain.update).toHaveBeenCalledWith({ display_name: "Carlos", bio: "Hi" });
    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
  });
});
