import { supabase } from "./client";

export type ProfileVisibility = "public" | "private";
export type FollowPolicy = "open" | "request";
export type ProgressVisibility = "public" | "private";
export type PlantSitterAttribution = "allowed" | "disabled";

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
  plant_sitter_attribution: PlantSitterAttribution;
  notify_comments: boolean;
  notify_likes: boolean;
  notify_follow_requests: boolean;
  notify_new_followers: boolean;
  notify_follow_accepted: boolean;
  notify_sitting_requests: boolean;
  notify_sitting_responses: boolean;
  notify_care_tasks: boolean;
};

// One flag per notification kind (migrations 0019 + 0020). The DB
// triggers -- and the hourly care-due cron scan -- check these before
// creating a notification row, so a disabled kind never even reaches
// the recipient's inbox.
export type NotificationSettings = {
  notify_comments: boolean;
  notify_likes: boolean;
  notify_follow_requests: boolean;
  notify_new_followers: boolean;
  notify_follow_accepted: boolean;
  notify_sitting_requests: boolean;
  notify_sitting_responses: boolean;
  notify_care_tasks: boolean;
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

// maybeSingle, not single: a 0-row result is a real case now (a block,
// or a deleted account), not an error -- surfaced as one friendly
// message that doesn't reveal which, same privacy principle as not
// telling a declined follow requester why.
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("This profile isn't available");
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

export async function updateMyAvatar(avatarUrl: string | null): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select()
    .single();

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

// Stamps the GDPR consent time on the user's own profile -- called from
// the welcome screen once the consent checkbox is confirmed (OAuth
// signups and pre-existing accounts never went through the sign-up
// form's checkbox).
export async function acceptPrivacyPolicy(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ accepted_privacy_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    throw error;
  }
}

export async function updatePrivacySettings(input: {
  profile_visibility: ProfileVisibility;
  follow_policy: FollowPolicy;
  progress_visibility: ProgressVisibility;
  plant_sitter_attribution: PlantSitterAttribution;
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

export async function updateNotificationSettings(input: NotificationSettings): Promise<Profile> {
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
