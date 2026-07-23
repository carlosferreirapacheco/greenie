import { createClient } from "npm:@supabase/supabase-js@^2";

// Receives Buy Me a Coffee's webhook events (donation.created etc.),
// verifies the HMAC-SHA256 signature, durably logs every event, and
// attempts to auto-match the donation to a Greenie account by email
// or an @username mention in the supporter's name/message -- see
// docs/admin-dashboard-backlog.md's "Supporter badge tier assignment"
// entry for the full design. Unmatched donations surface in the
// backoffice's reconciliation queue. Best-effort throughout: a
// matching failure never blocks acknowledging the webhook, since BMC
// retries on non-2xx and the raw donation is captured either way.
//
// Field-name caveat: BMC's current donation.created payload shape
// wasn't fully confirmed against their OpenAPI spec (not reachable
// from this environment) -- the extraction below checks a few
// plausible field-name variants defensively. Worth re-checking against
// a real delivery's logged bmc_donations row after the first live
// donation.

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // The header may or may not carry a "sha256=" prefix depending on
  // delivery -- strip defensively.
  const provided = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  return computedHex === provided;
}

// Matches a bare @username mention in free text -- BMC's checkout has
// both a name and a message field, either of which a supporter might
// use to self-identify. Deliberately looser than Greenie's own
// username validation (lib/supabase/usernames.ts) -- a loose match
// that then fails the real profiles.username lookup is harmless; a
// strict regex that misses a valid mention isn't.
function extractUsernameMention(...texts: (string | null | undefined)[]): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/@([a-z0-9][a-z0-9._]{1,18}[a-z0-9])/i);
    if (match) return match[1].toLowerCase();
  }
  return null;
}

// Event types that represent a real payment worth crediting to a
// running total. Refunds and other event types are logged for
// visibility but not auto-reconciled -- see the plan's "Explicitly
// out of scope" section.
const CREDIT_EVENT_TYPES = new Set([
  "donation.created",
  "recurring_donation.started",
  "membership.started",
  "extra_purchase.created",
  "commission_order.created",
  "wishlist_payment.created",
]);

Deno.serve(async (req) => {
  try {
    const secret = Deno.env.get("BMC_WEBHOOK_SECRET");
    const rawBody = await req.text();

    if (!secret || !(await verifySignature(rawBody, req.headers.get("x-signature-sha256"), secret))) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload?.event_id as string | undefined;
    const eventType = payload?.type as string | undefined;
    const data = payload?.data ?? {};

    if (!eventId || !eventType) {
      return jsonResponse({ error: "Malformed payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const supporterEmail: string | null = data.supporter_email ?? data.email ?? null;
    const supporterName: string | null = data.supporter_name ?? data.name ?? null;
    const message: string | null = data.message ?? data.support_note ?? data.note ?? null;
    const amount = Number(data.total_amount ?? data.amount ?? 0);
    const currency: string = data.currency ?? "EUR";

    // Idempotent insert first -- a unique-constraint conflict on
    // bmc_event_id means this delivery was already processed (BMC
    // retries on non-2xx), so acknowledge without reprocessing.
    const { data: inserted, error: insertError } = await admin
      .from("bmc_donations")
      .insert({
        bmc_event_id: eventId,
        event_type: eventType,
        supporter_email: supporterEmail,
        supporter_name: supporterName,
        message,
        amount,
        currency,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ status: "already processed" });
      }
      throw insertError;
    }

    if (!CREDIT_EVENT_TYPES.has(eventType) || amount <= 0) {
      return jsonResponse({ status: "logged, not credited" });
    }

    let matchedUserId: string | null = null;
    let matchMethod: "email" | "username_mention" | null = null;

    if (supporterEmail) {
      const { data: emailMatch } = await admin.rpc("find_user_id_by_email", { lookup_email: supporterEmail });
      if (emailMatch) {
        matchedUserId = emailMatch as string;
        matchMethod = "email";
      }
    }

    if (!matchedUserId) {
      const username = extractUsernameMention(message, supporterName);
      if (username) {
        const { data: profile } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
        if (profile) {
          matchedUserId = profile.id;
          matchMethod = "username_mention";
        }
      }
    }

    if (matchedUserId) {
      const { data: profile } = await admin.from("profiles").select("total_donated").eq("id", matchedUserId).single();
      const newTotal = Number(profile?.total_donated ?? 0) + amount;
      await admin.from("profiles").update({ total_donated: newTotal }).eq("id", matchedUserId);
      await admin
        .from("bmc_donations")
        .update({ matched_user_id: matchedUserId, match_method: matchMethod })
        .eq("id", inserted.id);
    }

    return jsonResponse({ status: "ok", matched: matchedUserId !== null });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
