import { supabase } from "./client";

export type ProfileVisibility = "public" | "private";
export type FollowPolicy = "open" | "request";
export type ProgressVisibility = "public" | "private";
export type CommentPolicy = "public" | "followers";

export type Profile = {
  id: string;
  username: string;
  username_changed_at: string | null;
  accepted_privacy_at: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  profile_visibility: ProfileVisibility;
  follow_policy: FollowPolicy;
  progress_visibility: ProgressVisibility;
  comment_policy: CommentPolicy;
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

  // Commas and parens would be parsed as PostgREST or() syntax, and no
  // display name or username legitimately contains them anyway.
  const sanitized = trimmed.replace(/[,()]/g, "");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`)
    .neq("id", user.id)
    .order("display_name", { ascending: true })
    .limit(20);

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMyProfile(input: {
  username: string;
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
      username: input.username,
      display_name: input.display_name,
      bio: input.bio,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    // Unique violation on profiles_username_unique -- the only unique
    // constraint this update can hit.
    if ((error as { code?: string }).code === "23505") {
      throw new Error("That username is already taken");
    }
    throw error;
  }

  return data;
}

export async function updatePrivacySettings(input: {
  profile_visibility: ProfileVisibility;
  follow_policy: FollowPolicy;
  progress_visibility: ProgressVisibility;
  comment_policy: CommentPolicy;
}): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
