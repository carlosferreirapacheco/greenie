import { supabase } from "./client";
import { getFriends } from "./follows";

export type ProgressReport = {
  id: string;
  plant_id: string;
  user_id: string;
  height_cm: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

export type FeedItem = ProgressReport & {
  author_display_name: string | null;
  plant_name: string;
  plant_species: string | null;
};

export async function getFeed(): Promise<FeedItem[]> {
  const friends = await getFriends();
  if (friends.length === 0) {
    return [];
  }

  const authorsById = new Map(friends.map((friend) => [friend.id, friend]));

  const { data: reports, error: reportsError } = await supabase
    .from("plant_progress")
    .select("*")
    .in(
      "user_id",
      friends.map((friend) => friend.id)
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (reportsError) {
    throw reportsError;
  }

  if (reports.length === 0) {
    return [];
  }

  const plantIds = [...new Set(reports.map((report) => report.plant_id))];
  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select("id, name, species")
    .in("id", plantIds);

  if (plantsError) {
    throw plantsError;
  }

  const plantsById = new Map(plants.map((plant) => [plant.id, plant]));

  return reports.map((report) => {
    const plant = plantsById.get(report.plant_id);
    return {
      ...report,
      author_display_name: authorsById.get(report.user_id)?.display_name ?? null,
      plant_name: plant?.name ?? "Unknown plant",
      plant_species: plant?.species ?? null,
    };
  });
}

export async function createProgressReport(input: {
  plant_id: string;
  height_cm: number | null;
  notes: string;
}): Promise<ProgressReport> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plant_progress")
    .insert({
      plant_id: input.plant_id,
      user_id: user.id,
      height_cm: input.height_cm,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
