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
  nickname: string | null;
};

// Nickname takes the primary display slot when set; otherwise falls
// back to the common name (plants.name).
export function plantPrimaryName(plant: Pick<Plant, "name" | "nickname">): string {
  const nickname = plant.nickname?.trim();
  return nickname ? nickname : plant.name;
}

// The common name, but only when a nickname is occupying the primary
// slot above -- so callers can show it as a secondary line without ever
// duplicating the common name when there's no nickname.
export function plantCommonNameSubtitle(plant: Pick<Plant, "name" | "nickname">): string | null {
  return plant.nickname?.trim() ? plant.name : null;
}

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

export async function getPlantsForUser(ownerId: string): Promise<Plant[]> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getPlant(id: string): Promise<Plant> {
  const { data, error } = await supabase.from("plants").select("*").eq("id", id).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePlantAcquiredAt(id: string, acquiredAt: string | null): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update({ acquired_at: acquiredAt })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePlantNickname(id: string, nickname: string | null): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update({ nickname })
    .eq("id", id)
    .select()
    .single();

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
  nickname: string | null;
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
      nickname: input.nickname,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
