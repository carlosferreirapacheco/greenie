import { supabase } from "./client";
import { getFriends } from "./follows";
import { getLikesForProgress } from "./likes";
import { getCommentsForProgressIds, type CommentWithAuthor } from "./comments";
import type { CommentPolicy } from "./profiles";

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
  author_username: string | null;
  author_comment_policy: CommentPolicy | null;
  plant_name: string;
  plant_nickname: string | null;
  plant_species: string | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  latest_comment: CommentWithAuthor | null;
};

type AuthorInfo = { display_name: string | null; username: string; comment_policy: CommentPolicy };

// Shared by getFeed (many reports, author info already known from the
// friends list) and getProgressReport (a single report, author info
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
    .select("id, name, species, nickname")
    .in("id", plantIds);

  if (plantsError) {
    throw plantsError;
  }

  const plantsById = new Map(plants.map((plant) => [plant.id, plant]));

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
    return {
      ...report,
      author_display_name: authorInfo?.display_name ?? null,
      author_username: authorInfo?.username ?? null,
      author_comment_policy: authorInfo?.comment_policy ?? null,
      plant_name: plant?.name ?? "Unknown plant",
      plant_nickname: plant?.nickname ?? null,
      plant_species: plant?.species ?? null,
      like_count: likeCountsById.get(report.id) ?? 0,
      liked_by_me: likedByMeIds.has(report.id),
      comment_count: commentCountsById.get(report.id) ?? 0,
      latest_comment: latestCommentById.get(report.id) ?? null,
    };
  });
}

export async function getFeed(): Promise<FeedItem[]> {
  const friends = await getFriends();
  if (friends.length === 0) {
    return [];
  }

  const authorInfoById = new Map<string, AuthorInfo>(
    friends.map((friend) => [
      friend.id,
      { display_name: friend.display_name, username: friend.username, comment_policy: friend.comment_policy },
    ])
  );

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

  return hydrateReports(reports, authorInfoById);
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
    .select("display_name, username, comment_policy")
    .eq("id", report.user_id)
    .single();

  if (authorError) {
    throw authorError;
  }

  const authorInfoById = new Map<string, AuthorInfo>([
    [
      report.user_id,
      { display_name: author.display_name, username: author.username, comment_policy: author.comment_policy },
    ],
  ]);
  const [item] = await hydrateReports([report], authorInfoById);
  return item;
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
