import { supabase } from "./client";
import type { Profile } from "./profiles";

export type FollowStatus = "none" | "pending" | "accepted";

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
    .eq("follower_id", user.id)
    .eq("status", "accepted");

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

export async function getFollowStatus(userId: string): Promise<FollowStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("followee_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return "none";
  }

  return data.status as FollowStatus;
}

export async function followUser(userId: string): Promise<{ status: FollowStatus }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  // status isn't set here -- a trigger (set_follow_status) always
  // computes it server-side from the target's follow_policy, so a
  // client can't self-assign "accepted" to bypass an approval
  // requirement. Selecting the row back tells the UI which it landed as.
  const { data, error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: userId })
    .select("status")
    .single();

  if (error) {
    throw error;
  }

  return { status: data.status as FollowStatus };
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

export async function getPendingFollowRequests(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: pendingRows, error: pendingError } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", user.id)
    .eq("status", "pending");

  if (pendingError) {
    throw pendingError;
  }

  const followerIds = pendingRows.map((row) => row.follower_id);
  if (followerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", followerIds);

  if (error) {
    throw error;
  }

  return data;
}

export async function acceptFollowRequest(followerId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("followee_id", user.id);

  if (error) {
    throw error;
  }
}

export async function declineFollowRequest(followerId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("followee_id", user.id);

  if (error) {
    throw error;
  }
}
