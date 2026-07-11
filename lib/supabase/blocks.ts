import { supabase } from "./client";
import type { Profile } from "./profiles";

export type BlockStatus = "none" | "blocked_by_me";

// Deliberately can't detect "they blocked me" -- RLS (blocks_select_own)
// only exposes the signed-in user's own outgoing blocks, same privacy
// principle as not telling a declined follow requester why.
export async function getMyBlockStatus(userId: string): Promise<BlockStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? "blocked_by_me" : "none";
}

export async function blockUser(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: userId });

  if (error) {
    throw error;
  }
}

export async function unblockUser(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);

  if (error) {
    throw error;
  }
}

// Mirrors getFollowers()'s shape in ./follows.
export async function getBlockedUsers(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: blockRows, error: blockError } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);

  if (blockError) {
    throw blockError;
  }

  const blockedIds = blockRows.map((row) => row.blocked_id);
  if (blockedIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", blockedIds);

  if (error) {
    throw error;
  }

  return data;
}
