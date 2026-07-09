jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
  updatePasswordWithReauth,
  requestAccountDeletionCode,
  confirmAccountDeletion,
} from "./auth";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("signUpWithEmail", () => {
  it("returns the session and passes username + consent as auth metadata for handle_new_user()", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });

    const result = await signUpWithEmail("a@b.com", "pw123456", "carlos", true);

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pw123456",
      options: { data: { username: "carlos", privacy_accepted: true } },
    });
    expect(result).toEqual({ session: { access_token: "t" } });
  });

  it("returns a null session when email confirmation is required", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    const result = await signUpWithEmail("a@b.com", "pw123456", "carlos", true);

    expect(result).toEqual({ session: null });
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "Email already registered" };
    mockSupabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: err });

    await expect(signUpWithEmail("a@b.com", "pw123456", "carlos", true)).rejects.toBe(err);
  });
});

describe("requestAccountDeletionCode", () => {
  it("throws Not signed in without sending anything when there's no session email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(requestAccountDeletionCode()).rejects.toThrow("Not signed in");
    expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends the OTP to the session's own email without creating users", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });

    await requestAccountDeletionCode();

    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "a@b.com",
      options: { shouldCreateUser: false },
    });
  });
});

describe("confirmAccountDeletion", () => {
  it("never verifies the code or invokes the function when the password re-auth fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    const err = { message: "Invalid login credentials" };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: err });

    await expect(confirmAccountDeletion("wrongpw", "123456")).rejects.toBe(err);
    expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("never invokes the function when the emailed code is wrong", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    const err = { message: "Token has expired or is invalid" };
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: err });

    await expect(confirmAccountDeletion("pw", "000000")).rejects.toBe(err);
    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.com", token: "000000", type: "email" });
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("invokes delete-account then clears the local session on success", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    await confirmAccountDeletion("pw", " 123456 ");

    // The code arrives trimmed, and the sign-out is local-only -- the
    // server-side user (and its sessions) are already gone.
    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.com", token: "123456", type: "email" });
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("delete-account");
    expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("throws and skips the local sign-out when the function itself fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    const err = { message: "Account deletion failed" };
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(confirmAccountDeletion("pw", "123456")).rejects.toBe(err);
    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
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
