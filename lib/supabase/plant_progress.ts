import { supabase } from "./client";
import { getFollowing } from "./follows";
import { getLikesForProgress } from "./likes";
import { getCommentsForProgressIds, type CommentWithAuthor } from "./comments";

// Per-report (moved off profiles in migration 0012): who may comment.
// 'disabled' hides existing comments too (RLS) without deleting them.
export type CommentPolicy = "public" | "followers" | "disabled";

export type ProgressReport = {
  id: string;
  plant_id: string;
  user_id: string;
  height_cm: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  comment_policy: CommentPolicy;
  // Unlisted, not private: false only keeps the report out of feeds --
  // direct links still work for anyone who can see the report. Once
  // false, permanent (migration 0018's trigger rejects flipping it
  // back to true) -- comment_policy is transitively locked to
  // 'disabled' too, enforced by that migration's CHECK constraint.
  shared_to_feed: boolean;
};

// Business rule (migration 0018): an unlisted report can never have
// comments enabled. Used by both screens to derive the value actually
// sent/displayed; the DB CHECK constraint is the real backstop.
export function effectiveCommentPolicy(sharedToFeed: boolean, commentPolicy: CommentPolicy): CommentPolicy {
  return sharedToFeed ? commentPolicy : "disabled";
}

export type FeedItem = ProgressReport & {
  author_display_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  plant_name: string;
  plant_nickname: string | null;
  plant_species: string | null;
  // The plant's actual owner -- distinct from the report's author
  // (user_id) once plant-sitting lets a sitter log progress on a plant
  // they don't own. Falls back to the author when the plant itself
  // couldn't be resolved (e.g. deleted), so callers' "was this logged
  // by someone other than the owner" check defaults to "no".
  plant_owner_id: string;
  plant_owner_display_name: string | null;
  plant_owner_username: string | null;
  // The plant's current main photo (plants.photo_urls[0]), so a viewer
  // who owns the plant can tell whether this report's own photo_url is
  // already the plant's photo -- drives the "Set as plant's photo"
  // action on the report detail screen.
  plant_photo_url: string | null;
  // Whether the plant's owner currently allows a sitter's report on
  // their plant to be shared to the sitter's own feed (see
  // can_share_progress_to_feed() RLS, migration 0016). Fails open
  // (true) if the owner's profile couldn't be resolved, matching
  // isConsentCurrent()'s fail-open precedent for missing config.
  plant_owner_share_allowed: boolean;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  latest_comment: CommentWithAuthor | null;
};

type AuthorInfo = { display_name: string | null; username: string; avatar_url: string | null };

// Shared by getFeed (many reports, author info already known from the
// following list) and getProgressReport (a single report, author info
// looked up fresh) -- everything else (plants, likes, comments) is
// batch-fetched and combined client-side the same way either way.
async function hydrateReports(reports: ProgressReport[], authorInfoById: Map<string, AuthorInfo>): Promise<FeedItem[]> {
  if (reports.length === 0) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plantIds = [...new Set(reports.map((report) => report.plant_id))];
  const { data: plants, error: plantsError } = await supabase
    .from("plants")
    .select("id, name, species, nickname, owner_id, photo_urls")
    .in("id", plantIds);

  if (plantsError) {
    throw plantsError;
  }

  const plantsById = new Map(plants.map((plant) => [plant.id, plant]));

  // Owner info is always fetched fresh (not reused from authorInfoById)
  // because we need plant_sitter_attribution, which that cache doesn't
  // carry -- and reusing the *author's* cached info here would be
  // wrong anyway whenever author !== owner, exactly the sitter case
  // this field exists for.
  const ownerIds = [...new Set(plants.map((plant) => plant.owner_id))];
  const ownerInfoById = new Map<string, AuthorInfo>(authorInfoById);
  const shareAllowedByOwnerId = new Map<string, boolean>();
  if (ownerIds.length > 0) {
    const { data: ownerProfiles, error: ownerProfilesError } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, plant_sitter_attribution")
      .in("id", ownerIds);

    if (ownerProfilesError) {
      throw ownerProfilesError;
    }

    for (const profile of ownerProfiles) {
      ownerInfoById.set(profile.id, {
        display_name: profile.display_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
      });
      shareAllowedByOwnerId.set(profile.id, profile.plant_sitter_attribution === "allowed");
    }
  }

  const reportIds = reports.map((report) => report.id);
  const [likes, comments] = await Promise.all([
    getLikesForProgress(reportIds),
    getCommentsForProgressIds(reportIds),
  ]);

  const likeCountsById = new Map<string, number>();
  const likedByMeIds = new Set<string>();
  for (const like of likes) {
    likeCountsById.set(like.progress_id, (likeCountsById.get(like.progress_id) ?? 0) + 1);
    if (like.user_id === user?.id) {
      likedByMeIds.add(like.progress_id);
    }
  }

  const commentCountsById = new Map<string, number>();
  const latestCommentById = new Map<string, CommentWithAuthor>();
  for (const comment of comments) {
    commentCountsById.set(comment.progress_id, (commentCountsById.get(comment.progress_id) ?? 0) + 1);
    // comments arrives newest-first, so the first one seen per
    // progress_id is the latest.
    if (!latestCommentById.has(comment.progress_id)) {
      latestCommentById.set(comment.progress_id, comment);
    }
  }

  return reports.map((report) => {
    const plant = plantsById.get(report.plant_id);
    const authorInfo = authorInfoById.get(report.user_id);
    const plantOwnerId = plant?.owner_id ?? report.user_id;
    const plantOwnerInfo = ownerInfoById.get(plantOwnerId);
    return {
      ...report,
      author_display_name: authorInfo?.display_name ?? null,
      author_username: authorInfo?.username ?? null,
      author_avatar_url: authorInfo?.avatar_url ?? null,
      plant_name: plant?.name ?? "Unknown plant",
      plant_nickname: plant?.nickname ?? null,
      plant_species: plant?.species ?? null,
      plant_owner_id: plantOwnerId,
      plant_owner_display_name: plantOwnerInfo?.display_name ?? null,
      plant_owner_username: plantOwnerInfo?.username ?? null,
      plant_photo_url: plant?.photo_urls?.[0] ?? null,
      plant_owner_share_allowed: shareAllowedByOwnerId.get(plantOwnerId) ?? true,
      like_count: likeCountsById.get(report.id) ?? 0,
      liked_by_me: likedByMeIds.has(report.id),
      comment_count: commentCountsById.get(report.id) ?? 0,
      latest_comment: latestCommentById.get(report.id) ?? null,
    };
  });
}

const FEED_PAGE_SIZE = 20;

export type FeedPage = { items: FeedItem[]; nextCursor: string | null };

// Cursor-based (keyset) pagination on created_at, not offset/.range() --
// offset pagination shifts under a feed that's actively being appended
// to (a followed account posting mid-scroll skews every later page's
// offset), which keyset pagination avoids since each page is anchored
// to the last row actually seen, not a position in a moving set.
export async function getFeed(options?: { before?: string }): Promise<FeedPage> {
  const following = await getFollowing();
  if (following.length === 0) {
    return { items: [], nextCursor: null };
  }

  const authorInfoById = new Map<string, AuthorInfo>(
    following.map((person) => [
      person.id,
      { display_name: person.display_name, username: person.username, avatar_url: person.avatar_url },
    ])
  );

  let query = supabase
    .from("plant_progress")
    .select("*")
    .in(
      "user_id",
      following.map((person) => person.id)
    )
    .eq("shared_to_feed", true)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data: reports, error: reportsError } = await query;

  if (reportsError) {
    throw reportsError;
  }

  const items = await hydrateReports(reports, authorInfoById);
  // A full page means there could be more; a short page means this was
  // the last one. Accepted edge case: if the remaining rows exactly
  // equal FEED_PAGE_SIZE, this looks like "more" until the next fetch
  // comes back empty -- one harmless extra round-trip, not a bug.
  const nextCursor = reports.length === FEED_PAGE_SIZE ? reports[reports.length - 1].created_at : null;
  return { items, nextCursor };
}

export async function getProgressReport(id: string): Promise<FeedItem> {
  const { data: report, error: reportError } = await supabase
    .from("plant_progress")
    .select("*")
    .eq("id", id)
    .single();

  if (reportError) {
    throw reportError;
  }

  const { data: author, error: authorError } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", report.user_id)
    .single();

  if (authorError) {
    throw authorError;
  }

  const authorInfoById = new Map<string, AuthorInfo>([
    [report.user_id, { display_name: author.display_name, username: author.username, avatar_url: author.avatar_url }],
  ]);
  const [item] = await hydrateReports([report], authorInfoById);
  return item;
}

export async function createProgressReport(input: {
  plant_id: string;
  height_cm: number | null;
  notes: string;
  comment_policy: CommentPolicy;
  shared_to_feed: boolean;
  photo_url?: string | null;
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
      comment_policy: input.comment_policy,
      shared_to_feed: input.shared_to_feed,
      photo_url: input.photo_url ?? null,
    })
    .select()
    .single();

  if (error) {
    // 42501 here means the plant_progress_insert_own RLS check
    // failed -- with shared_to_feed true, that's the
    // can_share_progress_to_feed() gate rejecting a sitter's report
    // because the plant's owner has plant_sitter_attribution
    // 'disabled' (the other insert-time checks are all covered by the
    // "am I owner or active sitter" gate the UI already respects).
    if ((error as { code?: string }).code === "42501") {
      throw new Error("This plant's owner doesn't allow sitters to share reports to a feed -- save it as unlisted instead.");
    }
    throw error;
  }

  return data;
}

// Every report for one plant, newest first -- deliberately does NOT
// filter shared_to_feed. Relies purely on plant_progress_select_visible
// RLS (owner always; others per progress_visibility/follower/block
// status), which is what makes this the one place unlisted reports
// surface besides a direct link.
export async function getProgressReportsForPlant(plantId: string): Promise<ProgressReport[]> {
  const { data, error } = await supabase
    .from("plant_progress")
    .select("*")
    .eq("plant_id", plantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// Owner-only via the plant_progress_update_own RLS policy.
export async function updateProgressReportSettings(
  id: string,
  input: { comment_policy: CommentPolicy; shared_to_feed: boolean }
): Promise<ProgressReport> {
  const { data, error } = await supabase
    .from("plant_progress")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Same 42501 case as createProgressReport(): flipping an unlisted
    // sitter report to shared_to_feed:true after the fact hits the
    // same can_share_progress_to_feed() gate.
    if ((error as { code?: string }).code === "42501") {
      throw new Error("This plant's owner doesn't allow sitters to share reports to a feed -- save it as unlisted instead.");
    }
    throw error;
  }

  return data;
}
