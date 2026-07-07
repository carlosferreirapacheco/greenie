import { supabase } from "./client";

export type Plant = {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  photo_urls: string[] | null;
  location: string | null;
  acquired_at: string | null;
  created_at: string;
};

export async function getMyPlants(): Promise<Plant[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createPlant(input: {
  name: string;
  species: string;
  location: string | null;
  acquired_at: string | null;
}): Promise<Plant> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plants")
    .insert({
      owner_id: user.id,
      name: input.name,
      species: input.species,
      location: input.location,
      acquired_at: input.acquired_at,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
