import { supabase } from "./client";

export type NotificationType =
  | "comment"
  | "like"
  | "follow_request"
  | "new_follower"
  | "follow_accepted"
  | "sitting_request"
  | "sitting_accepted"
  | "sitting_declined";

// Rows are created exclusively by the DB triggers in migration 0019
// (no client INSERT policy exists) -- this module only reads them and
// marks them read.
export type AppNotification = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  // Set for comment/like notifications so the row can deep-link to the
  // report; null for follow/sitting kinds.
  progress_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = AppNotification & {
  actor_display_name: string | null;
  actor_username: string | null;
  actor_avatar_url: string | null;
};

export async function getNotifications(): Promise<NotificationWithActor[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  if (rows.length === 0) {
    return [];
  }

  // Batch-hydrate actor info, same pattern as hydrateReports(). An
  // actor's profile can be invisible to this user (block asymmetry) --
  // those fall back to nulls and the screen renders a neutral name.
  const actorIds = [...new Set(rows.map((row) => row.actor_id))];
  const { data: actors, error: actorsError } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", actorIds);

  if (actorsError) {
    throw actorsError;
  }

  const actorsById = new Map(actors.map((actor) => [actor.id, actor]));

  return rows.map((row) => {
    const actor = actorsById.get(row.actor_id);
    return {
      ...row,
      actor_display_name: actor?.display_name ?? null,
      actor_username: actor?.username ?? null,
      actor_avatar_url: actor?.avatar_url ?? null,
    };
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markAllNotificationsRead(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}
