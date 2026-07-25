import { supabase } from "./client";
import { plantPrimaryName } from "./plants";

export type NotificationType =
  | "comment"
  | "like"
  | "follow_request"
  | "new_follower"
  | "follow_accepted"
  | "sitting_request"
  | "sitting_accepted"
  | "sitting_declined"
  | "care_due"
  | "sitting_grace_day"
  | "sitting_grace_expired";

// Rows are created exclusively by the DB triggers in migration 0019
// plus the hourly care-due cron scan in migration 0020 (no client
// INSERT policy exists) -- this module only reads them and marks them
// read.
export type AppNotification = {
  id: string;
  recipient_id: string;
  // Null for care_due/sitting_grace_day/sitting_grace_expired -- these
  // come from the system (the hourly cron scans), not a person.
  actor_id: string | null;
  type: NotificationType;
  // Set for comment/like notifications so the row can deep-link to the
  // report; null for follow/sitting/care kinds.
  progress_id: string | null;
  // Set for care_due/sitting_grace_day/sitting_grace_expired (the plant
  // to deep-link to + the task type for the sentence); null for every
  // social kind.
  plant_id: string | null;
  care_task_type: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = AppNotification & {
  actor_display_name: string | null;
  actor_username: string | null;
  actor_avatar_url: string | null;
  // The plant's primary (display) name for care_due/sitting_grace_day/
  // sitting_grace_expired rows; null otherwise, or when the plant has
  // since been deleted.
  plant_name: string | null;
};

// Shared by getNotifications() and getUnreadNotificationsByType() --
// batch-hydrates actor info (same pattern as hydrateReports(); an
// actor's profile can be invisible to this user via block asymmetry,
// falling back to nulls) and plant info (care_due/sitting_grace_day/
// sitting_grace_expired rows; plants are publicly readable, so this
// works whether the recipient is the owner or a sitter).
async function hydrateNotifications(rows: AppNotification[]): Promise<NotificationWithActor[]> {
  if (rows.length === 0) {
    return [];
  }

  const actorIds = [
    ...new Set(rows.map((row) => row.actor_id).filter((id): id is string => typeof id === "string")),
  ];
  const actorsById = new Map<string, { id: string; display_name: string | null; username: string | null; avatar_url: string | null }>();
  if (actorIds.length > 0) {
    const { data: actors, error: actorsError } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", actorIds);

    if (actorsError) {
      throw actorsError;
    }
    for (const actor of actors) {
      actorsById.set(actor.id, actor);
    }
  }

  const plantIds = [
    ...new Set(rows.map((row) => row.plant_id).filter((id): id is string => typeof id === "string")),
  ];
  const plantsById = new Map<string, { id: string; name: string; nickname: string | null }>();
  if (plantIds.length > 0) {
    const { data: plants, error: plantsError } = await supabase
      .from("plants")
      .select("id, name, nickname")
      .in("id", plantIds);

    if (plantsError) {
      throw plantsError;
    }
    for (const plant of plants) {
      plantsById.set(plant.id, plant);
    }
  }

  return rows.map((row) => {
    const actor = row.actor_id ? actorsById.get(row.actor_id) : undefined;
    const plant = row.plant_id ? plantsById.get(row.plant_id) : undefined;
    return {
      ...row,
      actor_display_name: actor?.display_name ?? null,
      actor_username: actor?.username ?? null,
      actor_avatar_url: actor?.avatar_url ?? null,
      plant_name: plant ? plantPrimaryName(plant) : null,
    };
  });
}

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

  return hydrateNotifications(rows);
}

// Drives the tabs layout's grace-day popup modal (app/(tabs)/_layout.tsx):
// unread sitting_grace_day rows only, oldest first so a sitter with
// several sees them one at a time in the order they actually opened.
export async function getUnreadNotificationsByType(type: NotificationType): Promise<NotificationWithActor[]> {
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
    .eq("type", type)
    .is("read_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return hydrateNotifications(rows);
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

// Marks a single notification read, unlike markAllNotificationsRead() --
// used by the grace-day popup modal so dismissing one doesn't also
// silently clear the inbox's other unread highlights.
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);

  if (error) {
    throw error;
  }
}
