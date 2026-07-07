import { supabase } from "./client";
import type { Profile } from "./profiles";

export async function getFriends(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: followRows, error: followError } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id);

  if (followError) {
    throw followError;
  }

  const followeeIds = followRows.map((row) => row.followee_id);
  if (followeeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", followeeIds);

  if (error) {
    throw error;
  }

  return data;
}

export async function isFollowing(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id)
    .eq("followee_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

export async function followUser(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_id: userId });

  if (error) {
    throw error;
  }
}

export async function unfollowUser(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", userId);

  if (error) {
    throw error;
  }
}
