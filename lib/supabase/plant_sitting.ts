import { supabase } from "./client";
import type { Profile } from "./profiles";

export type SittingStatus = "pending" | "accepted" | "declined" | "cancelled";

export type PlantSittingAssignment = {
  id: string;
  owner_id: string;
  sitter_id: string;
  status: SittingStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  responded_at: string | null;
  cancelled_at: string | null;
};

export type SittingAccessState = "pending" | "upcoming" | "active" | "ended" | "declined" | "cancelled";

// Pure -- mirrors getPlantCareStatus()/isConsentCurrent()'s pattern of
// keeping time-window math testable separately from the fetch layer.
// An 'accepted' assignment isn't necessarily currently active: if
// starts_at is in the future, access hasn't opened yet ("upcoming");
// past ends_at, it's "ended" even though the row is still 'accepted'
// (no scheduled job needed -- this and the RLS date-window checks both
// just compare against now() at query/render time).
export function computeSittingAccessState(
  assignment: Pick<PlantSittingAssignment, "status" | "starts_at" | "ends_at">,
  now: Date = new Date()
): SittingAccessState {
  if (assignment.status !== "accepted") {
    return assignment.status;
  }

  if (assignment.ends_at && now.getTime() > new Date(assignment.ends_at).getTime()) {
    return "ended";
  }

  if (assignment.starts_at && now.getTime() < new Date(assignment.starts_at).getTime()) {
    return "upcoming";
  }

  return "active";
}

export async function requestPlantSitting(
  sitterId: string,
  startsAt: string | null,
  endsAt: string | null
): Promise<PlantSittingAssignment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plant_sitting_assignments")
    .insert({ owner_id: user.id, sitter_id: sitterId, starts_at: startsAt, ends_at: endsAt })
    .select()
    .single();

  if (error) {
    // 42501 (insufficient_privilege): the mutual-follow RLS check
    // failed. 23505 (unique_violation): a live request already exists
    // between this pair.
    if ((error as { code?: string }).code === "42501") {
      throw new Error("You can only request plant-sitting from someone who follows you back.");
    }
    if ((error as { code?: string }).code === "23505") {
      throw new Error("There's already an open plant-sitting request with this person.");
    }
    throw error;
  }

  return data;
}

async function hydrateWithProfiles<T extends { owner_id: string; sitter_id: string }>(
  assignments: T[],
  side: "owner" | "sitter"
): Promise<(T & { profile: Profile })[]> {
  if (assignments.length === 0) {
    return [];
  }

  const ids = [...new Set(assignments.map((assignment) => (side === "owner" ? assignment.owner_id : assignment.sitter_id)))];
  const { data: profiles, error } = await supabase.from("profiles").select("*").in("id", ids);

  if (error) {
    throw error;
  }

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return assignments.map((assignment) => ({
    ...assignment,
    profile: profilesById.get(side === "owner" ? assignment.owner_id : assignment.sitter_id)!,
  }));
}

// As sitter: pending requests awaiting my response.
export async function getMySittingRequests(): Promise<(PlantSittingAssignment & { owner: Profile })[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plant_sitting_assignments")
    .select("*")
    .eq("sitter_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const hydrated = await hydrateWithProfiles(data, "owner");
  return hydrated.map(({ profile, ...rest }) => ({ ...rest, owner: profile }));
}

// As sitter: assignments I've accepted (upcoming/active/ended -- see
// computeSittingAccessState).
export async function getMySittingAssignments(): Promise<(PlantSittingAssignment & { owner: Profile })[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plant_sitting_assignments")
    .select("*")
    .eq("sitter_id", user.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const hydrated = await hydrateWithProfiles(data, "owner");
  return hydrated.map(({ profile, ...rest }) => ({ ...rest, owner: profile }));
}

// As owner: every request I've sent, excluding ones I've cancelled.
export async function getMySentRequests(): Promise<(PlantSittingAssignment & { sitter: Profile })[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plant_sitting_assignments")
    .select("*")
    .eq("owner_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const hydrated = await hydrateWithProfiles(data, "sitter");
  return hydrated.map(({ profile, ...rest }) => ({ ...rest, sitter: profile }));
}

export async function acceptSittingRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("plant_sitting_assignments")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function declineSittingRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("plant_sitting_assignments")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function cancelSittingRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("plant_sitting_assignments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

// As sitter: owner_ids of assignments I can act on right now (accepted
// and within the date window) -- used by plant/[id].tsx to compute
// isSitting without a plant-scoped query.
export async function getMyActiveAssignmentOwnerIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("plant_sitting_assignments")
    .select("owner_id, status, starts_at, ends_at")
    .eq("sitter_id", user.id)
    .eq("status", "accepted");

  if (error) {
    throw error;
  }

  return data.filter((assignment) => computeSittingAccessState(assignment) === "active").map((assignment) => assignment.owner_id);
}
