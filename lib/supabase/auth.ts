import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

export async function signUpWithEmail(email: string, password: string): Promise<{ session: Session | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw error;
  }

  return { session: data.session };
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
