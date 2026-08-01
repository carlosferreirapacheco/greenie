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
// same reasoning as delete-account's own logError(). Never throws.
async function logError(params: { userId: string | null; errorMessage: string }) {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin.from("app_error_logs").insert({
      source: "plant_photo_cleanup",
      user_id: params.userId,
      error_message: params.errorMessage.slice(0, 2000),
    });
  } catch (loggingError) {
    console.error("Failed to write app_error_logs row:", loggingError);
  }
}

// Deletes every Storage photo attached to a plant -- its own photo_urls
// plus its progress reports' photo_url values -- keyed by which plant
// they belong to, not by who uploaded them. This needs the service-role
// key: Storage's own DELETE RLS only lets the uploader remove their own
// objects (<uploaderId>/<context>/<filename>), so a plant owner can't
// clean up a photo an active sitter uploaded on their plant through a
// normal client call. Ownership of the plant itself is still checked
// against the caller's own JWT before anything is deleted.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let userId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Not signed in" }, 401);
    }

    const { plantId } = await req.json();
    if (!plantId || typeof plantId !== "string") {
      return jsonResponse({ error: "plantId is required" }, 400);
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

    // Read through the caller's own RLS-scoped client -- plants_select_visible
    // already grants an owner unconditional visibility into their own plant
    // and its progress reports, so this naturally fails closed (empty/no
    // row) for a plant the caller doesn't own or can't see.
    const { data: plant, error: plantError } = await userClient
      .from("plants")
      .select("id, owner_id, photo_urls")
      .eq("id", plantId)
      .maybeSingle();

    if (plantError) {
      throw plantError;
    }
    if (!plant || plant.owner_id !== user.id) {
      return jsonResponse({ error: "Not authorized to clean up this plant's photos" }, 403);
    }

    const { data: reports, error: reportsError } = await userClient
      .from("plant_progress")
      .select("photo_url")
      .eq("plant_id", plantId);

    if (reportsError) {
      throw reportsError;
    }

    const urls = [...(plant.photo_urls ?? []), ...(reports ?? []).map((r) => r.photo_url)].filter(
      (url): url is string => typeof url === "string",
    );

    if (urls.length === 0) {
      return jsonResponse({ success: true, deletedCount: 0 });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const marker = "/object/public/photos/";
    const paths = urls
      .map((url) => {
        const idx = url.indexOf(marker);
        return idx === -1 ? null : url.slice(idx + marker.length);
      })
      .filter((path): path is string => path !== null);

    if (paths.length > 0) {
      const { error: removeError } = await adminClient.storage.from("photos").remove(paths);
      if (removeError) {
        throw removeError;
      }
    }

    return jsonResponse({ success: true, deletedCount: paths.length });
  } catch (error) {
    console.error(error);
    await logError({ userId, errorMessage: error instanceof Error ? error.message : String(error) });
    return jsonResponse({ error: "Plant photo cleanup failed" }, 500);
  }
});
