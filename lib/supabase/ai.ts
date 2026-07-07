import { supabase } from "./client";

export type PlantLookupResult = {
  name: string;
  species: string;
  wateringFrequencyDays: number;
};

export async function lookupPlantInfo(query: string): Promise<PlantLookupResult> {
  const { data, error } = await supabase.functions.invoke<PlantLookupResult>("lookup-plant", {
    body: { query },
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Lookup returned no data");
  }

  return data;
}
