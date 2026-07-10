import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

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

// Web-only for now: the browser does a full-page redirect through
// Supabase to Google and back, and the client picks the session out of
// the return URL (detectSessionInUrl, see ./client). Native needs a
// different mechanism (expo-web-browser + custom scheme) -- backlogged
// until the app targets devices.
export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS !== "web") {
    throw new Error("Google sign-in is only available on the web for now");
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

// Emails a one-time confirmation code to the account's own address --
// the first half of account deletion's proof of mailbox control.
export async function requestAccountDeletionCode(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    throw error;
  }
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
