import { supabase } from "./client";
import { getMyProfile } from "./profiles";

// Everything the app stores about the signed-in user, assembled for the
// GDPR "download my data" export in Settings.
export type MyDataExport = {
  exported_at: string;
  account: {
    id: string;
    email: string | null;
    username: string;
    display_name: string | null;
    bio: string | null;
    profile_visibility: string;
    follow_policy: string;
    progress_visibility: string;
    accepted_privacy_at: string | null;
    username_changed_at: string | null;
    created_at: string;
  };
  plants: unknown[];
  care_tasks: unknown[];
  progress_reports: unknown[];
  comments: unknown[];
  likes: unknown[];
  follows: { following: unknown[]; followers: unknown[] };
  blocks: unknown[];
  notifications: unknown[];
  push_tokens: unknown[];
};

export async function collectMyData(): Promise<MyDataExport> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const profile = await getMyProfile();

  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select("*")
    .eq("owner_id", user.id);

  if (plantsError) {
    throw plantsError;
  }

  let careTasks: unknown[] = [];
  if (plants.length > 0) {
    const { data, error } = await supabase
      .from("care_tasks")
      .select("*")
      .in(
        "plant_id",
        plants.map((plant) => plant.id)
      );

    if (error) {
      throw error;
    }
    careTasks = data;
  }

  const { data: reports, error: reportsError } = await supabase
    .from("plant_progress")
    .select("*")
    .eq("user_id", user.id);

  if (reportsError) {
    throw reportsError;
  }

  // Own comments/likes across ALL reports, including other users'. RLS
  // can exclude ones whose parent report is no longer visible to this
  // user (e.g. an author who went private after the comment was made) --
  // an accepted limitation of the client-side export.
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", user.id);

  if (commentsError) {
    throw commentsError;
  }

  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("*")
    .eq("user_id", user.id);

  if (likesError) {
    throw likesError;
  }

  // follows_select_own means this returns exactly the rows the user is
  // a party to -- both directions in one query.
  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("*")
    .or(`follower_id.eq.${user.id},followee_id.eq.${user.id}`);

  if (followsError) {
    throw followsError;
  }

  // blocks_select_own means this returns exactly the accounts the user
  // has blocked -- the blocked party's own outgoing blocks (if any)
  // stay invisible to this query, by design.
  const { data: blocks, error: blocksError } = await supabase.from("blocks").select("*").eq("blocker_id", user.id);

  if (blocksError) {
    throw blocksError;
  }

  // notifications_select_own means this returns exactly the rows where
  // the user is the recipient.
  const { data: notifications, error: notificationsError } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id);

  if (notificationsError) {
    throw notificationsError;
  }

  // push_tokens RLS is owner-only, so this is exactly the user's own
  // registered devices.
  const { data: pushTokens, error: pushTokensError } = await supabase
    .from("push_tokens")
    .select("*")
    .eq("user_id", user.id);

  if (pushTokensError) {
    throw pushTokensError;
  }

  return {
    exported_at: new Date().toISOString(),
    account: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      profile_visibility: profile.profile_visibility,
      follow_policy: profile.follow_policy,
      progress_visibility: profile.progress_visibility,
      accepted_privacy_at: profile.accepted_privacy_at,
      username_changed_at: profile.username_changed_at,
      created_at: profile.created_at,
    },
    plants,
    care_tasks: careTasks,
    progress_reports: reports,
    comments,
    likes,
    follows: {
      following: follows.filter((row: { follower_id: string }) => row.follower_id === user.id),
      followers: follows.filter((row: { followee_id: string }) => row.followee_id === user.id),
    },
    blocks,
    notifications,
    push_tokens: pushTokens,
  };
}

// Emails a copy of an already-collected export to the signed-in user's
// own address, via the email-data-export Edge Function -- the function
// reads the recipient off the caller's own JWT server-side, never a
// client-supplied address, so this can only ever send a user their own
// data to their own registered email.
export async function emailMyDataExport(data: MyDataExport): Promise<void> {
  const { error } = await supabase.functions.invoke("email-data-export", { body: data });

  if (error) {
    throw error;
  }
}
