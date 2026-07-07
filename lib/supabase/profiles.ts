import { supabase } from "./client";

export type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type MyProfile = Profile & { email: string | null };

export async function getMyProfile(): Promise<MyProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error) {
    throw error;
  }

  return { ...data, email: user.email ?? null };
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("display_name", `%${trimmed}%`)
    .neq("id", user.id)
    .order("display_name", { ascending: true })
    .limit(20);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMyProfile(input: {
  display_name: string | null;
  bio: string | null;
}): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name,
      bio: input.bio,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
