import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

// Closes the in-app browser tab once it redirects back to the app --
// a no-op on native until an AuthSession-based flow is actually in
// progress, safe/recommended to call once at module scope regardless.
WebBrowser.maybeCompleteAuthSession();

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
  privacyAccepted: boolean
): Promise<{ session: Session | null }> {
  // The username and consent flag ride along as auth metadata; the
  // handle_new_user() trigger (migrations 0009/0010) reads them when
  // creating the profiles row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, privacy_accepted: privacyAccepted } },
  });

  if (error) {
    throw error;
  }

  return { session: data.session };
}

// Native counterpart to the web redirect flow below: opens Google's
// consent screen in an in-app browser tab (expo-web-browser) and waits
// for Supabase's own callback to redirect back to this device-local
// build's greenie://redirect URL (expo-auth-session's makeRedirectUri()
// -- an explicit path matters: verified live that a bare `scheme://`
// with no path doesn't get reliably caught by Android's redirect
// matching inside openAuthSessionAsync). Google's Cloud Console
// redirect URI never changes for this -- it's always Supabase's fixed
// /auth/v1/callback, identical to the web flow; only Supabase's own
// Redirect URLs allowlist needs greenie://redirect added. Android also
// delivers this deep link to expo-router's own navigation in parallel
// with openAuthSessionAsync capturing it, so app/redirect.tsx exists
// purely to give it a harmless landing spot instead of an "Unmatched
// Route" error -- the actual session handling happens entirely here.
async function signInWithGoogleNative(): Promise<void> {
  const redirectTo = makeRedirectUri({ path: "redirect" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    // skipBrowserRedirect: the web-only auto-navigation this option
    // guards against doesn't apply here -- we open the URL ourselves.
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) {
    throw error;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    // User backed out of the browser tab -- not an error.
    return;
  }

  // Tokens arrive in the redirect URL's fragment (#access_token=...),
  // the same implicit-grant shape the web flow's detectSessionInUrl
  // already handles -- getQueryParams() is the helper Supabase's own
  // Expo guide uses since plain fragment parsing is finicky across RN's
  // URL polyfill.
  const { params, errorCode } = QueryParams.getQueryParams(result.url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const { access_token, refresh_token } = params;

  if (!access_token || !refresh_token) {
    return;
  }

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });

  if (sessionError) {
    throw sessionError;
  }
}

// Web does a full-page redirect through Supabase to Google and back,
// picking the session out of the return URL (detectSessionInUrl, see
// ./client); native opens an in-app browser tab instead -- see
// signInWithGoogleNative() above.
export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS !== "web") {
    await signInWithGoogleNative();
    return;
  }

  const origin = (globalThis as { location?: { origin: string } }).location?.origin;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: origin },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

// Emails a one-time code to prove control of an address, without
// creating a new account if it doesn't already belong to one. Shared
// by every flow that needs to confirm mailbox control of the
// signed-in user's *current* email before a sensitive change.
async function sendCurrentEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    throw error;
  }
}

// Emails a one-time confirmation code to the account's own address --
// the first half of account deletion's proof of mailbox control.
export async function requestAccountDeletionCode(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  await sendCurrentEmailOtp(user.email);
}

// Same emailed-code mechanism as account deletion, reused as a general
// "prove you control the current session's email" gate before changing
// the account's email or linking a new sign-in identity to it.
export async function requestCurrentEmailConfirmationCode(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  await sendCurrentEmailOtp(user.email);
}

export async function verifyCurrentEmailConfirmationCode(code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code.trim(),
    type: "email",
  });

  if (error) {
    throw error;
  }
}

// Whether the account can sign in with a password at all. Password
// accounts have an "email" identity; a Google-only (OAuth) account
// doesn't, so password re-auth flows can't apply to it.
export async function accountHasPassword(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  return (data?.identities ?? []).some((identity) => identity.provider === "email");
}

// Mirrors accountHasPassword() for the Google identity specifically --
// null means not linked (drives whether Settings offers "Link Google
// account" at all), otherwise the linked identity's own email. Changing
// the account's primary email via changeAccountEmail() never touches
// this -- the two can drift apart, so Settings shows this value
// alongside the primary email rather than just a linked/not-linked
// boolean, to make that drift visible instead of silent.
export async function getLinkedGoogleEmail(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  const googleIdentity = (data?.identities ?? []).find((identity) => identity.provider === "google");
  return (googleIdentity?.identity_data?.email as string | undefined) ?? null;
}

// Changes the account's email. Supabase's own confirmation link to the
// *new* address still applies on top of this -- untouched, since that's
// the separate, desired proof that the new address is real and owned.
export async function changeAccountEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    throw error;
  }
}

const PENDING_GOOGLE_LINK_SYNC_KEY = "greenie_pending_google_link_sync";

// Web-only, mirrors signInWithGoogle()'s redirect shape: links a Google
// identity to the *currently signed-in* account rather than signing
// into a new/existing one. A localStorage flag (matching the existing
// web-only detectSessionInUrl pattern in ./client) survives the
// full-page redirect so the app knows to sync the account's email to
// the newly-linked Google identity once it lands back here -- see
// completePendingGoogleLinkSync().
export async function linkGoogleAccount(): Promise<void> {
  if (Platform.OS !== "web") {
    throw new Error("Linking a Google account is only available on the web for now");
  }

  const origin = (globalThis as { location?: { origin: string } }).location?.origin;

  globalThis.localStorage?.setItem(PENDING_GOOGLE_LINK_SYNC_KEY, "1");

  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    // Returns to Settings specifically (unlike signInWithGoogle()'s
    // plain origin redirect) since that's where
    // completePendingGoogleLinkSync() runs and the sync banner shows.
    options: { redirectTo: origin ? `${origin}/settings` : undefined },
  });

  if (error) {
    globalThis.localStorage?.removeItem(PENDING_GOOGLE_LINK_SYNC_KEY);
    throw error;
  }
}

// Called on Settings mount. If linkGoogleAccount() was used and the
// redirect has landed back here, sets the account's email to the newly
// linked Google identity's email (the previous email is disregarded,
// per the linking flow's intent) and returns it so the caller can show
// a confirmation banner. No-op (null) on native or when nothing is
// pending.
export async function completePendingGoogleLinkSync(): Promise<string | null> {
  if (Platform.OS !== "web" || globalThis.localStorage?.getItem(PENDING_GOOGLE_LINK_SYNC_KEY) !== "1") {
    return null;
  }

  globalThis.localStorage.removeItem(PENDING_GOOGLE_LINK_SYNC_KEY);

  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw error;
  }

  const googleIdentity = (data?.identities ?? []).find((identity) => identity.provider === "google");
  const googleEmail = googleIdentity?.identity_data?.email as string | undefined;

  if (!googleEmail) {
    return null;
  }

  await changeAccountEmail(googleEmail);
  return googleEmail;
}

// Deleting an account requires BOTH the current password and the emailed
// code: a password alone isn't enough if the credentials are compromised
// (the attacker would have it), and an unlocked session alone isn't
// enough either. The actual deletion runs in the delete-account Edge
// Function, which holds the service-role key and only ever deletes the
// authenticated caller.
export async function confirmAccountDeletion(currentPassword: string, code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (reauthError) {
    throw reauthError;
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code.trim(),
    type: "email",
  });

  if (otpError) {
    throw otpError;
  }

  const { error: fnError } = await supabase.functions.invoke("delete-account");

  if (fnError) {
    throw fnError;
  }

  // The auth user (and every server-side session) is already gone; only
  // the locally stored session state is left to clear.
  await supabase.auth.signOut({ scope: "local" });
}

// Deletion confirm for accounts with no password (Google-only): the
// emailed code is the security factor -- it proves mailbox control
// independent of a stolen or unlocked app session, which is also why a
// fresh Google redirect would add nothing (it proves control of the
// same Google account the mailbox already does). The screen adds a
// typed-username check on top, but that's an anti-accident gate, not
// authentication.
export async function confirmPasswordlessAccountDeletion(code: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: code.trim(),
    type: "email",
  });

  if (otpError) {
    throw otpError;
  }

  const { error: fnError } = await supabase.functions.invoke("delete-account");

  if (fnError) {
    throw fnError;
  }

  await supabase.auth.signOut({ scope: "local" });
}

// Re-authenticates with the current password before changing it --
// supabase.auth.updateUser() alone only needs a valid session and never
// asks for the current password, so without this an unlocked/left-open
// session could change the password with no verification at all.
export async function updatePasswordWithReauth(currentPassword: string, newPassword: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (reauthError) {
    throw reauthError;
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    throw updateError;
  }
}
