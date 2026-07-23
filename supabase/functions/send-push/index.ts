import { createClient } from "npm:@supabase/supabase-js@^2";

// Called by the push_notification_webhook DB trigger (migration 0020)
// whenever a notifications row is inserted. Looks up the recipient's
// registered device tokens and forwards the notification to Expo's
// push service. Deployed with JWT verification off (the caller is a
// Postgres trigger, not a user); the trigger authenticates with a
// shared secret held in Vault, compared here against the
// PUSH_WEBHOOK_SECRET function secret. The payload is only an id --
// everything sent to devices is re-read with the service role, so a
// spoofed call can at worst re-send an existing notification, never
// fabricate one.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Best-effort durable logging into app_error_logs (migration 0027) --
// same reasoning as lookup-plant's ai_lookup_error_logs: Supabase's
// own function logs only retain ~24h. Never throws; a logging
// failure must not affect the caller's response.
async function logError(
  admin: ReturnType<typeof createClient>,
  params: { userId: string | null; detail: string | null; errorMessage: string },
) {
  try {
    await admin.from("app_error_logs").insert({
      source: "push",
      user_id: params.userId,
      detail: params.detail,
      error_message: params.errorMessage.slice(0, 2000),
    });
  } catch (loggingError) {
    console.error("Failed to write app_error_logs row:", loggingError);
  }
}

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  progress_id: string | null;
  plant_id: string | null;
  care_task_type: string | null;
};

function actorName(actor: { display_name: string | null; username: string | null } | null): string {
  if (actor?.display_name) {
    return actor.display_name;
  }
  return actor?.username ? `@${actor.username}` : "Someone";
}

// Mirrors app/notifications.tsx's per-kind sentences (social) and the
// old local reminder's buildReminderContent (care_due).
function buildMessage(
  notification: NotificationRow,
  actor: { display_name: string | null; username: string | null } | null,
  plant: { name: string; nickname: string | null } | null
): { title: string; body?: string } | null {
  if (notification.type === "care_due") {
    const plantName = plant ? plant.nickname ?? plant.name : "your plant";
    return {
      title: `Time to ${notification.care_task_type ?? "care for"} ${plantName}`,
      body: "Tap to open this plant and mark it done.",
    };
  }

  const name = actorName(actor);
  switch (notification.type) {
    case "comment":
      return { title: `${name} commented on your report` };
    case "like":
      return { title: `${name} liked your report` };
    case "follow_request":
      return { title: `${name} requested to follow you` };
    case "new_follower":
      return { title: `${name} started following you` };
    case "follow_accepted":
      return { title: `${name} accepted your follow request` };
    case "sitting_request":
      return { title: `${name} asked you to plant-sit` };
    case "sitting_accepted":
      return { title: `${name} accepted your plant-sitting request` };
    case "sitting_declined":
      return { title: `${name} declined your plant-sitting request` };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { notification_id } = await req.json();
    if (typeof notification_id !== "string") {
      return jsonResponse({ error: "notification_id required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: notification, error: notificationError } = await admin
      .from("notifications")
      .select("id, recipient_id, actor_id, type, progress_id, plant_id, care_task_type")
      .eq("id", notification_id)
      .maybeSingle();

    if (notificationError) {
      throw notificationError;
    }
    if (!notification) {
      return jsonResponse({ error: "Not found" }, 404);
    }

    // No registered devices is the common case (web users, push turned
    // off on the device) -- the row is already in the in-app inbox, so
    // there's nothing more to do.
    const { data: tokens, error: tokensError } = await admin
      .from("push_tokens")
      .select("token")
      .eq("user_id", notification.recipient_id);

    if (tokensError) {
      throw tokensError;
    }
    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: 0 });
    }

    let actor: { display_name: string | null; username: string | null } | null = null;
    if (notification.actor_id) {
      const { data } = await admin
        .from("profiles")
        .select("display_name, username")
        .eq("id", notification.actor_id)
        .maybeSingle();
      actor = data;
    }

    let plant: { name: string; nickname: string | null } | null = null;
    if (notification.plant_id) {
      const { data } = await admin
        .from("plants")
        .select("name, nickname")
        .eq("id", notification.plant_id)
        .maybeSingle();
      plant = data;
    }

    const message = buildMessage(notification, actor, plant);
    if (!message) {
      return jsonResponse({ sent: 0 });
    }

    const pushMessages = tokens.map(({ token }) => ({
      to: token,
      title: message.title,
      ...(message.body ? { body: message.body } : {}),
      data: {
        type: notification.type,
        progressId: notification.progress_id,
        actorId: notification.actor_id,
        plantId: notification.plant_id,
      },
    }));

    const staleTokens: string[] = [];
    let sent = 0;

    for (let i = 0; i < pushMessages.length; i += EXPO_PUSH_CHUNK_SIZE) {
      const chunk = pushMessages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      const result = await response.json();

      // Tickets come back aligned with the messages sent; a
      // DeviceNotRegistered ticket means the token is dead (app
      // uninstalled, token rotated) and its row should go away.
      const tickets: { status: string; message?: string; details?: { error?: string } }[] = result?.data ?? [];
      for (const [index, ticket] of tickets.entries()) {
        if (ticket.status === "ok") {
          sent += 1;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          staleTokens.push(chunk[index].to);
        } else {
          // Any other non-ok ticket (rate-limited, MessageTooBig,
          // InvalidCredentials, etc.) was previously silently dropped --
          // counted as neither sent nor removed. Log it so a systemic
          // delivery problem is visible instead of invisible.
          await logError(admin, {
            userId: notification.recipient_id,
            detail: `ticket: ${ticket.details?.error ?? ticket.status}`,
            errorMessage: ticket.message ?? JSON.stringify(ticket),
          });
        }
      }
    }

    if (staleTokens.length > 0) {
      await admin.from("push_tokens").delete().in("token", staleTokens);
    }

    return jsonResponse({ sent, removed: staleTokens.length });
  } catch (error) {
    console.error(error);
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      await logError(admin, {
        userId: null,
        detail: "outer catch",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (loggingError) {
      console.error("Failed to write app_error_logs row:", loggingError);
    }
    return jsonResponse({ error: "Push delivery failed" }, 500);
  }
});
