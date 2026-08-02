import { supabase } from "./client";
import { getMyProfile } from "./profiles";

export type FeedbackType = "suggestion" | "bug" | "feedback" | "other";

export const FEEDBACK_TYPES: FeedbackType[] = ["suggestion", "bug", "feedback", "other"];

// The DB trigger (enforce_feedback_rate_limit, migration 0035) raises
// a Postgres exception with errcode P0001 when the same user submits
// again within 60 seconds -- that's the actual enforcement. This is
// just a typed error so the screen can show a friendly message instead
// of the raw Postgres text, same pattern as AiLookupOverloadedError in
// lib/supabase/ai.ts.
export class FeedbackRateLimitedError extends Error {
  constructor() {
    super("Feedback rate limited");
    this.name = "FeedbackRateLimitedError";
  }
}

export async function submitFeedback(params: {
  type: FeedbackType;
  description: string;
  photoUrls: string[];
}): Promise<void> {
  const profile = await getMyProfile();

  const { error } = await supabase.from("app_feedback").insert({
    user_id: profile.id,
    username: profile.username,
    email: profile.email ?? "",
    type: params.type,
    description: params.description,
    photo_urls: params.photoUrls,
  });

  if (error) {
    if (error.code === "P0001") {
      throw new FeedbackRateLimitedError();
    }
    throw error;
  }
}
