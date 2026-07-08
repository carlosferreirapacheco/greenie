import { supabase } from "./client";

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
