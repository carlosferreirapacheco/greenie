jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import {
  acceptPrivacyPolicy,
  getMyProfile,
  getProfile,
  searchProfiles,
  updateMyProfile,
  updatePrivacySettings,
} from "./profiles";

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

  it("throws a friendly error instead of a raw 0-row error when the profile isn't visible", async () => {
    // Covers both a deleted account and a block (RLS hides the row
    // either way) -- the message deliberately doesn't distinguish.
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: null }));

    await expect(getProfile("u2")).rejects.toThrow("This profile isn't available");
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

  it("searches display_name and username together, excluding the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: [{ id: "u2", display_name: "Sammy" }], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await searchProfiles("  sam  ");

    expect(chain.or).toHaveBeenCalledWith("display_name.ilike.%sam%,username.ilike.%sam%");
    expect(chain.neq).toHaveBeenCalledWith("id", "u1");
    expect(result).toEqual([{ id: "u2", display_name: "Sammy" }]);
  });

  it("strips PostgREST or() syntax characters from the query", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    await searchProfiles("sam,username.eq.(x)");

    expect(chain.or).toHaveBeenCalledWith("display_name.ilike.%samusername.eq.x%,username.ilike.%samusername.eq.x%");
  });
});

describe("updateMyProfile", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(updateMyProfile({ username: "carlos", display_name: "Carlos", bio: null })).rejects.toThrow(
      "Not signed in"
    );
  });

  it("updates username, display_name, and bio for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({
      data: { id: "u1", username: "carlos", display_name: "Carlos", bio: "Hi" },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    await updateMyProfile({ username: "carlos", display_name: "Carlos", bio: "Hi" });

    expect(chain.update).toHaveBeenCalledWith({ username: "carlos", display_name: "Carlos", bio: "Hi" });
    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
  });

  it("maps a unique violation to a friendly taken-username error", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: { code: "23505", message: "duplicate key" } });
    mockSupabase.from.mockReturnValue(chain);

    await expect(updateMyProfile({ username: "taken", display_name: null, bio: null })).rejects.toThrow(
      "That username is already taken"
    );
  });
});

describe("acceptPrivacyPolicy", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(acceptPrivacyPolicy()).rejects.toThrow("Not signed in");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("stamps accepted_privacy_at on the signed-in user's own row", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await acceptPrivacyPolicy();

    expect(chain.update).toHaveBeenCalledWith({ accepted_privacy_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
  });
});

describe("updatePrivacySettings", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      updatePrivacySettings({
        profile_visibility: "private",
        follow_policy: "request",
        progress_visibility: "private",
      })
    ).rejects.toThrow("Not signed in");
  });

  it("updates all three privacy fields for the signed-in user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const settings = {
      profile_visibility: "private" as const,
      follow_policy: "request" as const,
      progress_visibility: "private" as const,
    };
    const chain = createChainableQueryMock({ data: { id: "u1", ...settings }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await updatePrivacySettings(settings);

    expect(chain.update).toHaveBeenCalledWith(settings);
    expect(chain.eq).toHaveBeenCalledWith("id", "u1");
  });
});
