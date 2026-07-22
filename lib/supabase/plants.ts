import { supabase } from "./client";
import type { CareDifficulty, LightExposure, ToxicityAnswer } from "./ai";

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
  archived_at: string | null;
  light_exposure: LightExposure | null;
  care_difficulty: CareDifficulty | null;
  toxic_to_pets: ToxicityAnswer | null;
  toxic_to_humans: ToxicityAnswer | null;
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
    .is("archived_at", null)
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
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// Archived plants only, most recently archived first -- the dedicated
// management screen for restore/delete, kept out of every other plant
// list in the app.
export async function getArchivedPlants(): Promise<Plant[]> {
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
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

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

// Single-photo v1 -- the array column stays available for a future
// multi-photo gallery without a schema change, but this always writes
// (or clears) just the one slot.
export async function updatePlantPhoto(id: string, photoUrl: string | null): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update({ photo_urls: photoUrl ? [photoUrl] : null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Reversible: hides the plant from every list (getMyPlants,
// getPlantsForUser) and stops the hourly care-due scan from generating
// new reminders for it, without touching care_tasks/plant_progress.
export async function archivePlant(id: string): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function restorePlant(id: string): Promise<Plant> {
  const { data, error } = await supabase
    .from("plants")
    .update({ archived_at: null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Permanent -- care_tasks/plant_progress/notifications for this plant
// all cascade-delete at the DB level (on delete cascade FKs). Storage
// objects (photos) are not cleaned up, a known accepted gap elsewhere
// in this project.
export async function deletePlant(id: string): Promise<void> {
  const { error } = await supabase.from("plants").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function createPlant(input: {
  name: string;
  species: string;
  location: string | null;
  acquired_at: string | null;
  nickname: string | null;
  photo_url?: string | null;
  light_exposure?: LightExposure | null;
  care_difficulty?: CareDifficulty | null;
  toxic_to_pets?: ToxicityAnswer | null;
  toxic_to_humans?: ToxicityAnswer | null;
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
      photo_urls: input.photo_url ? [input.photo_url] : null,
      light_exposure: input.light_exposure ?? null,
      care_difficulty: input.care_difficulty ?? null,
      toxic_to_pets: input.toxic_to_pets ?? null,
      toxic_to_humans: input.toxic_to_humans ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
