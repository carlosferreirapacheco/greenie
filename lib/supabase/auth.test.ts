jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { signUpWithEmail, signInWithEmail, signOut, updatePasswordWithReauth } from "./auth";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("signUpWithEmail", () => {
  it("returns the session on success", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

    const result = await signUpWithEmail("a@b.com", "pw123456");

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({ email: "a@b.com", password: "pw123456" });
    expect(result).toEqual({ session: { access_token: "t" } });
  });

  it("returns a null session when email confirmation is required", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const result = await signUpWithEmail("a@b.com", "pw123456");

    expect(result).toEqual({ session: null });
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "Email already registered" };
    mockSupabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: err });

    await expect(signUpWithEmail("a@b.com", "pw123456")).rejects.toBe(err);
  });
});

describe("signInWithEmail", () => {
  it("returns the session on success", async () => {
    const session = { access_token: "t2" };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null });

    const result = await signInWithEmail("a@b.com", "pw123456");

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "pw123456" });
    expect(result).toBe(session);
  });

  it("throws on invalid credentials", async () => {
    const err = { message: "Invalid login credentials" };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: err });

    await expect(signInWithEmail("a@b.com", "wrong")).rejects.toBe(err);
  });
});

describe("signOut", () => {
  it("resolves on success", async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    await expect(signOut()).resolves.toBeUndefined();
  });

  it("throws on failure", async () => {
    const err = { message: "network error" };
    mockSupabase.auth.signOut.mockResolvedValue({ error: err });

    await expect(signOut()).rejects.toBe(err);
  });
});

describe("updatePasswordWithReauth", () => {
  it("throws Not signed in without attempting reauth when there's no session email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(updatePasswordWithReauth("old", "newpass1")).rejects.toThrow("Not signed in");
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("never calls updateUser when reauth fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    const err = { message: "Invalid login credentials" };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: err });

    await expect(updatePasswordWithReauth("wrongold", "newpass1")).rejects.toBe(err);
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "wrongold" });
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("calls updateUser with the new password after a successful reauth", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    await updatePasswordWithReauth("correctold", "newpass1");

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: "newpass1" });
  });

  it("throws when the password update itself fails after a successful reauth", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    const err = { message: "Password too short" };
    mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: err });

    await expect(updatePasswordWithReauth("correctold", "x")).rejects.toBe(err);
  });
});
