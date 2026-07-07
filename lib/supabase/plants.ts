import { supabase } from "./client";

export type Plant = {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  photo_urls: string[] | null;
  location: string | null;
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
