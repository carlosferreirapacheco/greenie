import { supabase } from "./client";

// Device push tokens (migration 0020). One row per device, keyed by
// the token itself; rows are read server-side by the send-push Edge
// Function to deliver OS pushes. Registration/unregistration is
// driven by lib/pushNotificationManager.ts.

export async function upsertPushToken(token: string, platform: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase.from("push_tokens").upsert({
    token,
    user_id: user.id,
    platform,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function deletePushToken(token: string): Promise<void> {
  const { error } = await supabase.from("push_tokens").delete().eq("token", token);

  if (error) {
    throw error;
  }
}
