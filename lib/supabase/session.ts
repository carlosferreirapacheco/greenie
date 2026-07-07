import { supabase } from "./client";

// TEMPORARY: signs in as a fixed dev user until real sign-up/sign-in
// screens exist. Delete this file (and its call site in app/_layout.tsx)
// once real auth is built.
const devUserEmail = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
const devUserPassword = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;

export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }

  if (!devUserEmail || !devUserPassword) {
    throw new Error(
      "Missing EXPO_PUBLIC_DEV_USER_EMAIL or EXPO_PUBLIC_DEV_USER_PASSWORD. Set them in .env to sign in as the temporary dev user."
    );
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: devUserEmail,
    password: devUserPassword,
  });

  if (error) {
    throw error;
  }

  return signInData.session;
}
