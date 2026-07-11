import { supabase } from "./client";

// The privacy policy's effective date (app_config, migration 0013 --
// bumped via migration whenever the policy materially changes). Null
// when the row is missing.
export async function getPrivacyPolicyUpdatedAt(): Promise<string | null> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "privacy_policy_updated_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.value ?? null;
}

// Whether an account's consent still counts: it must exist AND be no
// older than the policy's effective date. A missing effective date
// fails open to "any acceptance counts" -- a config hiccup must not
// lock every user out behind the consent gate.
export function isConsentCurrent(acceptedAt: string | null, policyUpdatedAt: string | null): boolean {
  if (acceptedAt === null) {
    return false;
  }
  if (policyUpdatedAt === null) {
    return true;
  }
  return new Date(acceptedAt).getTime() >= new Date(policyUpdatedAt).getTime();
}
