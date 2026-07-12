import { supabase } from "./client";
import type { Profile } from "./profiles";

export type FollowStatus = "none" | "pending" | "accepted";

export async function getFollowing(): Promise<Profile[]> {
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

// Mirror of getFollowing() with the join direction flipped: the accepted
// followers OF the signed-in user.
export async function getFollowers(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: followRows, error: followError } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", user.id)
    .eq("status", "accepted");

  if (followError) {
    throw followError;
  }

  const followerIds = followRows.map((row) => row.follower_id);
  if (followerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", followerIds);

  if (error) {
    throw error;
  }

  return data;
}

// People the signed-in user follows AND who follow back, both accepted
// -- the precondition for requesting plant-sitting from them. Fetches
// both directions in parallel, then intersects client-side; mirrors
// getFollowing()/getFollowers()'s fetch-then-hydrate shape.
export async function getMutualFollowers(): Promise<Profile[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const [followingResult, followersResult] = await Promise.all([
    supabase.from("follows").select("followee_id").eq("follower_id", user.id).eq("status", "accepted"),
    supabase.from("follows").select("follower_id").eq("followee_id", user.id).eq("status", "accepted"),
  ]);

  if (followingResult.error) {
    throw followingResult.error;
  }
  if (followersResult.error) {
    throw followersResult.error;
  }

  const followingIds = new Set(followingResult.data.map((row) => row.followee_id));
  const mutualIds = followersResult.data.map((row) => row.follower_id).filter((id) => followingIds.has(id));

  if (mutualIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("profiles").select("*").in("id", mutualIds);

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

// Reverse direction of getFollowStatus(): does userId follow ME
// (accepted)? Used to gate mutual-follow-only affordances (e.g.
// "Request plant-sitting") client-side -- RLS is the real enforcement
// either way.
export async function amIFollowedBy(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", userId)
    .eq("followee_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.status === "accepted";
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
    // 42501 (insufficient_privilege) here means the RLS WITH CHECK
    // rejected the insert -- in practice, a block exists between the
    // two accounts. Don't say which direction; same privacy principle
    // as not telling a declined follow requester why.
    if ((error as { code?: string }).code === "42501") {
      throw new Error("You can't follow this account.");
    }
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

// Deletes the follow row targeting the signed-in user, via the
// follows_delete_by_followee RLS policy. Works on any status: removing
// an accepted follower and declining a pending request are the same
// delete, they just read differently in the UI.
export async function removeFollower(followerId: string): Promise<void> {
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

export async function declineFollowRequest(followerId: string): Promise<void> {
  return removeFollower(followerId);
}
