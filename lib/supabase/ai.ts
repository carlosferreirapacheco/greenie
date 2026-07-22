import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { SupportedLocale } from "../i18n";

// supabase-js's FunctionsHttpError always carries the same generic
// ".message" ("Edge Function returned a non-2xx status code") regardless
// of what lookup-plant actually failed on -- the real reason is only in
// error.context (the raw Response). The edge function itself durably
// logs the real cause server-side (see migration 0021,
// ai_lookup_error_logs), so callers here don't need that detail beyond
// this console.error for local debugging -- everything thrown from
// these two functions is a single generic "AI lookup failed" Error,
// letting screens show one friendly, translated message regardless of
// cause.
async function normalizeLookupError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      console.error("lookup-plant failed:", body);
    } catch {
      console.error("lookup-plant failed:", error);
    }
  } else {
    console.error("lookup-plant failed:", error);
  }
  return new Error("AI lookup failed");
}

export type PlantLookupResult = {
  name: string;
  species: string;
  wateringFrequencyDays: number;
};

// locale steers which language Gemini returns the common name (and, for
// the photo variant, candidateNames) in -- species stays the Latin
// binomial regardless, since that's universal, not localized.
export async function lookupPlantInfo(query: string, locale: SupportedLocale): Promise<PlantLookupResult> {
  const { data, error } = await supabase.functions.invoke<PlantLookupResult>("lookup-plant", {
    body: { query, locale },
  });

  if (error) {
    throw await normalizeLookupError(error);
  }

  if (!data) {
    throw new Error("AI lookup failed");
  }

  return data;
}

export type PlantPhotoLookupResult = {
  status: "found" | "ambiguous" | "not_found";
  name: string;
  species: string;
  wateringFrequencyDays: number;
  candidateNames: string[];
};

export async function lookupPlantByPhoto(
  photoUrl: string,
  hint: string | undefined,
  locale: SupportedLocale
): Promise<PlantPhotoLookupResult> {
  const { data, error } = await supabase.functions.invoke<PlantPhotoLookupResult>("lookup-plant", {
    body: { photoUrl, hint, locale },
  });

  if (error) {
    throw await normalizeLookupError(error);
  }

  if (!data) {
    throw new Error("AI lookup failed");
  }

  return data;
}
