import { supabase } from "./client";

export type LikerProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

// Who liked a report -- likes_select_visible RLS already scopes the rows
// this returns to exactly the visibility the report itself has. A liker
// whose profile isn't resolvable here (block asymmetry: they blocked the
// viewer, so profiles_select_visible hides their row even though the
// like is still visible) comes back with null fields; the screen falls
// back to "Someone", same as an unresolvable actor in the notifications
// inbox.
export async function getLikersForProgress(progressId: string): Promise<LikerProfile[]> {
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("user_id")
    .eq("progress_id", progressId);

  if (likesError) {
    throw likesError;
  }

  if (likes.length === 0) {
    return [];
  }

  const userIds = [...new Set(likes.map((like) => like.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return likes.map((like) => {
    const profile = profilesById.get(like.user_id);
    return {
      user_id: like.user_id,
      display_name: profile?.display_name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}

export async function getLikesForProgress(
  progressIds: string[]
): Promise<{ progress_id: string; user_id: string }[]> {
  if (progressIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("likes").select("progress_id, user_id").in("progress_id", progressIds);

  if (error) {
    throw error;
  }

  return data;
}

export async function likeProgress(progressId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("likes").insert({ progress_id: progressId, user_id: user.id });

  if (error) {
    throw error;
  }
}

export async function unlikeProgress(progressId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("progress_id", progressId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}
