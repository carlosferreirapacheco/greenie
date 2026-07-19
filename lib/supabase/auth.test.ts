jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "exp://192.168.1.23:8081/--/redirect"),
}));

jest.mock("expo-auth-session/build/QueryParams", () => ({
  getQueryParams: jest.fn(),
}));

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "./client";
import {
  signUpWithEmail,
  verifySignupCode,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  updatePasswordWithReauth,
  requestAccountDeletionCode,
  confirmAccountDeletion,
  confirmPasswordlessAccountDeletion,
  accountHasPassword,
  requestCurrentEmailConfirmationCode,
  verifyCurrentEmailConfirmationCode,
  getLinkedGoogleEmail,
  changeAccountEmail,
  linkGoogleAccount,
  completePendingGoogleLinkSync,
} from "./auth";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.Mock;
const mockGetQueryParams = QueryParams.getQueryParams as jest.Mock;

// jest-expo's environment has no browser localStorage -- a tiny
// in-memory stub for the web-only linkGoogleAccount()/
// completePendingGoogleLinkSync() tests.
function createLocalStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

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

describe("verifySignupCode", () => {
  it("verifies the trimmed code against the given email with type signup", async () => {
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });

    await verifySignupCode("a@b.com", " 123456 ");

    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.com", token: "123456", type: "signup" });
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "Token has expired or is invalid" };
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: err });

    await expect(verifySignupCode("a@b.com", "000000")).rejects.toBe(err);
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

describe("accountHasPassword", () => {
  it("is true when the account has an email (password) identity", async () => {
    mockSupabase.auth.getUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "email" }, { provider: "google" }] },
      error: null,
    });

    await expect(accountHasPassword()).resolves.toBe(true);
  });

  it("is false for an OAuth-only account", async () => {
    mockSupabase.auth.getUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "google" }] },
      error: null,
    });

    await expect(accountHasPassword()).resolves.toBe(false);
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "network error" };
    mockSupabase.auth.getUserIdentities.mockResolvedValue({ data: null, error: err });

    await expect(accountHasPassword()).rejects.toBe(err);
  });
});

describe("requestCurrentEmailConfirmationCode", () => {
  it("throws Not signed in without sending anything when there's no session email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(requestCurrentEmailConfirmationCode()).rejects.toThrow("Not signed in");
    expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends the OTP to the session's own email without creating users", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });

    await requestCurrentEmailConfirmationCode();

    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "a@b.com",
      options: { shouldCreateUser: false },
    });
  });
});

describe("verifyCurrentEmailConfirmationCode", () => {
  it("throws Not signed in without verifying anything when there's no session email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(verifyCurrentEmailConfirmationCode("123456")).rejects.toThrow("Not signed in");
    expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies the trimmed code against the session's own email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });

    await verifyCurrentEmailConfirmationCode(" 123456 ");

    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.com", token: "123456", type: "email" });
  });

  it("throws the Supabase error on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    const err = { message: "Token has expired or is invalid" };
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: err });

    await expect(verifyCurrentEmailConfirmationCode("000000")).rejects.toBe(err);
  });
});

describe("getLinkedGoogleEmail", () => {
  it("returns the google identity's email when linked", async () => {
    mockSupabase.auth.getUserIdentities.mockResolvedValue({
      data: {
        identities: [
          { provider: "email" },
          { provider: "google", identity_data: { email: "carlos@gmail.com" } },
        ],
      },
      error: null,
    });

    await expect(getLinkedGoogleEmail()).resolves.toBe("carlos@gmail.com");
  });

  it("returns null for a password-only account", async () => {
    mockSupabase.auth.getUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "email" }] },
      error: null,
    });

    await expect(getLinkedGoogleEmail()).resolves.toBeNull();
  });

  it("returns null when the google identity has no email", async () => {
    mockSupabase.auth.getUserIdentities.mockResolvedValue({
      data: { identities: [{ provider: "google", identity_data: {} }] },
      error: null,
    });

    await expect(getLinkedGoogleEmail()).resolves.toBeNull();
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "network error" };
    mockSupabase.auth.getUserIdentities.mockResolvedValue({ data: null, error: err });

    await expect(getLinkedGoogleEmail()).rejects.toBe(err);
  });
});

describe("changeAccountEmail", () => {
  it("calls updateUser with the new email", async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    await changeAccountEmail("new@b.com");

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ email: "new@b.com" });
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "Email already registered" };
    mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: err });

    await expect(changeAccountEmail("taken@b.com")).rejects.toBe(err);
  });
});

describe("linkGoogleAccount", () => {
  it("throws on native without starting an OAuth flow (jest-expo runs as iOS)", async () => {
    await expect(linkGoogleAccount()).rejects.toThrow("only available on the web");
    expect(mockSupabase.auth.linkIdentity).not.toHaveBeenCalled();
  });

  describe("on web", () => {
    let platformSpy: { restore: () => void };
    let localStorageStub: ReturnType<typeof createLocalStorageStub>;

    beforeEach(() => {
      platformSpy = jest.replaceProperty(Platform, "OS", "web");
      (globalThis as { location?: unknown }).location = { origin: "http://localhost:8081" };
      localStorageStub = createLocalStorageStub();
      (globalThis as { localStorage?: unknown }).localStorage = localStorageStub;
    });

    afterEach(() => {
      platformSpy.restore();
      delete (globalThis as { location?: unknown }).location;
      delete (globalThis as { localStorage?: unknown }).localStorage;
    });

    it("sets the pending-sync flag and redirects back to Settings specifically", async () => {
      mockSupabase.auth.linkIdentity.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });

      await linkGoogleAccount();

      expect(localStorageStub.getItem("greenie_pending_google_link_sync")).toBe("1");
      expect(mockSupabase.auth.linkIdentity).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "http://localhost:8081/settings" },
      });
    });

    it("clears the pending-sync flag and throws on failure", async () => {
      const err = { message: "Unsupported provider: provider is not enabled" };
      mockSupabase.auth.linkIdentity.mockResolvedValue({ data: {}, error: err });

      await expect(linkGoogleAccount()).rejects.toBe(err);
      expect(localStorageStub.getItem("greenie_pending_google_link_sync")).toBeNull();
    });
  });
});

describe("completePendingGoogleLinkSync", () => {
  it("is a no-op on native (jest-expo runs as iOS)", async () => {
    await expect(completePendingGoogleLinkSync()).resolves.toBeNull();
    expect(mockSupabase.auth.getUserIdentities).not.toHaveBeenCalled();
  });

  describe("on web", () => {
    let platformSpy: { restore: () => void };
    let localStorageStub: ReturnType<typeof createLocalStorageStub>;

    beforeEach(() => {
      platformSpy = jest.replaceProperty(Platform, "OS", "web");
      localStorageStub = createLocalStorageStub();
      (globalThis as { localStorage?: unknown }).localStorage = localStorageStub;
    });

    afterEach(() => {
      platformSpy.restore();
      delete (globalThis as { localStorage?: unknown }).localStorage;
    });

    it("is a no-op when nothing is pending", async () => {
      await expect(completePendingGoogleLinkSync()).resolves.toBeNull();
      expect(mockSupabase.auth.getUserIdentities).not.toHaveBeenCalled();
    });

    it("syncs the account email to the linked Google identity and clears the flag", async () => {
      localStorageStub.setItem("greenie_pending_google_link_sync", "1");
      mockSupabase.auth.getUserIdentities.mockResolvedValue({
        data: {
          identities: [
            { provider: "email" },
            { provider: "google", identity_data: { email: "carlos@gmail.com" } },
          ],
        },
        error: null,
      });
      mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

      await expect(completePendingGoogleLinkSync()).resolves.toBe("carlos@gmail.com");

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ email: "carlos@gmail.com" });
      expect(localStorageStub.getItem("greenie_pending_google_link_sync")).toBeNull();
    });

    it("returns null and still clears the flag when no Google identity is found", async () => {
      localStorageStub.setItem("greenie_pending_google_link_sync", "1");
      mockSupabase.auth.getUserIdentities.mockResolvedValue({
        data: { identities: [{ provider: "email" }] },
        error: null,
      });

      await expect(completePendingGoogleLinkSync()).resolves.toBeNull();

      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
      expect(localStorageStub.getItem("greenie_pending_google_link_sync")).toBeNull();
    });
  });
});

describe("confirmPasswordlessAccountDeletion", () => {
  it("throws Not signed in without verifying anything when there's no session email", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(confirmPasswordlessAccountDeletion("123456")).rejects.toThrow("Not signed in");
    expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("never invokes the function when the emailed code is wrong", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    const err = { message: "Token has expired or is invalid" };
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: err });

    await expect(confirmPasswordlessAccountDeletion("000000")).rejects.toBe(err);
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("verifies the code, invokes delete-account, then clears the local session -- no password re-auth", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    await confirmPasswordlessAccountDeletion(" 123456 ");

    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: "a@b.com", token: "123456", type: "email" });
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("delete-account");
    expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("throws and skips the local sign-out when the function itself fails", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSupabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    const err = { message: "Account deletion failed" };
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(confirmPasswordlessAccountDeletion("123456")).rejects.toBe(err);
    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
  });
});

describe("signInWithGoogle", () => {
  // jest-expo's environment runs as iOS, so these exercise the native
  // (expo-web-browser + expo-auth-session) branch by default.
  describe("on native", () => {
    it("opens the OAuth URL and completes the session on a successful redirect", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { url: "https://accounts.google.com/authorize" },
        error: null,
      });
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: "success",
        url: "exp://192.168.1.23:8081/--/redirect#access_token=at&refresh_token=rt",
      });
      mockGetQueryParams.mockReturnValue({
        errorCode: null,
        params: { access_token: "at", refresh_token: "rt" },
      });
      mockSupabase.auth.setSession.mockResolvedValue({ data: {}, error: null });

      await signInWithGoogle();

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "exp://192.168.1.23:8081/--/redirect", skipBrowserRedirect: true },
      });
      expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
        "https://accounts.google.com/authorize",
        "exp://192.168.1.23:8081/--/redirect"
      );
      expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({ access_token: "at", refresh_token: "rt" });
    });

    it("does nothing when the user cancels the browser tab", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" });

      await expect(signInWithGoogle()).resolves.toBeUndefined();
      expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
    });

    it("throws the Supabase signInWithOAuth error without opening a browser tab", async () => {
      const err = { message: "Unsupported provider: provider is not enabled" };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: err });

      await expect(signInWithGoogle()).rejects.toBe(err);
      expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
    });

    it("throws when the redirect URL reports an error code", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: "success", url: "exp://192.168.1.23:8081/--/redirect#error=access_denied" });
      mockGetQueryParams.mockReturnValue({ errorCode: "access_denied", params: {} });

      await expect(signInWithGoogle()).rejects.toThrow("access_denied");
      expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
    });

    it("throws the Supabase setSession error", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
      mockOpenAuthSessionAsync.mockResolvedValue({
        type: "success",
        url: "exp://192.168.1.23:8081/--/redirect#access_token=at&refresh_token=rt",
      });
      mockGetQueryParams.mockReturnValue({ errorCode: null, params: { access_token: "at", refresh_token: "rt" } });
      const err = { message: "Invalid session" };
      mockSupabase.auth.setSession.mockResolvedValue({ data: {}, error: err });

      await expect(signInWithGoogle()).rejects.toBe(err);
    });
  });

  describe("on web", () => {
    let platformSpy: { restore: () => void };

    beforeEach(() => {
      platformSpy = jest.replaceProperty(Platform, "OS", "web");
      // jest-expo's environment has no browser location -- provide the
      // origin the browser would.
      (globalThis as { location?: unknown }).location = { origin: "http://localhost:8081" };
    });

    afterEach(() => {
      platformSpy.restore();
      delete (globalThis as { location?: unknown }).location;
    });

    it("starts the Google OAuth flow with a redirect back to the current origin", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });

      await signInWithGoogle();

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "http://localhost:8081" },
      });
    });

    it("redirects to a specific path when one is given", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });

      await signInWithGoogle("/delete-account");

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: "http://localhost:8081/delete-account" },
      });
    });

    it("throws the Supabase error on failure", async () => {
      const err = { message: "Unsupported provider: provider is not enabled" };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: err });

      await expect(signInWithGoogle()).rejects.toBe(err);
    });
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
