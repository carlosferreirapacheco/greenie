import { supabase } from "./client";

export type ProgressReport = {
  id: string;
  plant_id: string;
  user_id: string;
  height_cm: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

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
