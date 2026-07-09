import { supabase } from "./client";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

// Mirrors the profiles_username_format check constraint (migration
// 0009) -- keep the two in sync. Returns a human-readable problem, or
// null when the username is valid.
export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters`;
  }
  if (!/^[a-z]/.test(username)) {
    return "Username must start with a letter";
  }
  if (!/^[a-z0-9._]+$/.test(username)) {
    return "Username can only contain lowercase letters, numbers, dots, and underscores";
  }
  if (!/[a-z0-9]$/.test(username)) {
    return "Username must end with a letter or number";
  }
  if (/[._]{2}/.test(username)) {
    return "Dots and underscores can't be doubled or next to each other";
  }
  return null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", {
    candidate: normalizeUsername(username),
  });

  if (error) {
    throw error;
  }

  return data === true;
}

export async function getUsernameChangeCooldownDays(): Promise<number> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "username_change_cooldown_days")
    .single();

  if (error) {
    throw error;
  }

  const days = Number(data.value);
  return Number.isFinite(days) ? days : 5;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// When the username can next be changed, or null if it can be changed
// right now (never changed before, or the cooldown has elapsed).
export function nextUsernameChangeDate(
  changedAt: string | null,
  cooldownDays: number,
  now: Date = new Date()
): Date | null {
  if (!changedAt) {
    return null;
  }

  const next = new Date(new Date(changedAt).getTime() + cooldownDays * MS_PER_DAY);
  return next.getTime() > now.getTime() ? next : null;
}
