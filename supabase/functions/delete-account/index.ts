import { createClient } from "npm:@supabase/supabase-js@^2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Best-effort durable logging into app_error_logs (migration 0027) --
// same reasoning as lookup-plant's ai_lookup_error_logs: Supabase's
// own function logs only retain ~24h. Never throws.
async function logError(params: { userId: string | null; errorMessage: string }) {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin.from("app_error_logs").insert({
      source: "account_deletion",
      user_id: params.userId,
      error_message: params.errorMessage.slice(0, 2000),
    });
  } catch (loggingError) {
    console.error("Failed to write app_error_logs row:", loggingError);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let userId: string | null = null;

  try {
    // Identify the caller from their own JWT -- the function can only
    // ever delete the authenticated user, never an arbitrary id.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Not signed in" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Not signed in" }, 401);
    }
    userId = user.id;

    // The service-role key never leaves this function. Every user-owned
    // table cascades from auth.users (see migrations 0001/0002), so this
    // single delete erases the account and all of its app data.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }

    // Best-effort: purge the deleted user's own uploaded photos. Postgres
    // FK cascades don't reach storage.objects, so without this every
    // avatar/plant/progress photo they ever uploaded would be orphaned
    // forever -- a real gap against the privacy policy's erasure claim.
    // Storage paths are keyed by the uploader's own id
    // (<uploaderId>/<context>/<filename>, see lib/supabase/storage.ts),
    // so this only ever touches files this account itself uploaded --
    // a sitter's photos on someone else's plant live under the sitter's
    // own prefix and are correctly left alone. A failure here must never
    // look like a failed account deletion, since the account is already
    // gone at this point.
    try {
      for (const context of ["avatars", "plants", "progress"]) {
        const { data: files, error: listError } = await adminClient.storage
          .from("photos")
          .list(`${user.id}/${context}`);

        if (listError) {
          throw listError;
        }
        if (!files || files.length === 0) {
          continue;
        }

        const paths = files.map((file) => `${user.id}/${context}/${file.name}`);
        const { error: removeError } = await adminClient.storage.from("photos").remove(paths);
        if (removeError) {
          throw removeError;
        }
      }
    } catch (storageError) {
      console.error("Failed to purge storage objects for deleted account:", storageError);
      await logError({
        userId,
        errorMessage: `Storage cleanup failed: ${storageError instanceof Error ? storageError.message : String(storageError)}`,
      });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(error);
    await logError({ userId, errorMessage: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "Account deletion failed" }, 500);
  }
});
