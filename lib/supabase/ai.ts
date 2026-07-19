import { supabase } from "./client";
import type { SupportedLocale } from "../i18n";

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
    throw error;
  }

  if (!data) {
    throw new Error("Lookup returned no data");
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
    throw error;
  }

  if (!data) {
    throw new Error("Lookup returned no data");
  }

  return data;
}
