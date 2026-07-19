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

// UTF-8-safe base64 -- the export JSON can contain non-ASCII text
// (accented names, emoji in notes), which a bare btoa() can't handle
// since it only accepts Latin-1. Chunked to avoid call-stack limits
// from spreading a very large byte array at once.
function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Identify the caller from their own JWT -- the export can only
    // ever be emailed to the authenticated caller's own address, never
    // one supplied by the request body.
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

    if (userError || !user?.email) {
      return jsonResponse({ error: "Not signed in" }, 401);
    }

    // The export itself is whatever the client already collected via
    // collectMyData() -- this function's only job is delivery, not
    // re-querying the data (no service-role key needed at all).
    const exportData = await req.json();
    const json = JSON.stringify(exportData, null, 2);
    const filename = `greenie-data-${new Date().toISOString().slice(0, 10)}.json`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Greenie <noreply@mail.greenie-app.com>",
        to: [user.email],
        subject: "Your Greenie data export",
        html: `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 24px; color: #2F6B4F;">Greenie</h1>
  <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px;">Your requested data export is attached as a JSON file.</p>
  <p style="font-size: 14px; line-height: 1.5; margin: 0; color: #666666;">If you didn't request this, you can safely ignore this email.</p>
</div>`,
        attachments: [{ filename, content: encodeBase64(json) }],
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      throw new Error(`Resend error ${resendResponse.status}: ${detail}`);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Email delivery failed" }, 500);
  }
});
