import { supabase } from "./client";

export type Comment = {
  id: string;
  progress_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  author_display_name: string | null;
  author_username: string | null;
};

async function hydrateAuthors(comments: Comment[]): Promise<CommentWithAuthor[]> {
  if (comments.length === 0) {
    return [];
  }

  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  const { data: authors, error } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", userIds);

  if (error) {
    throw error;
  }

  const authorsById = new Map(authors.map((author) => [author.id, author]));

  return comments.map((comment) => {
    const author = authorsById.get(comment.user_id);
    return {
      ...comment,
      author_display_name: author?.display_name ?? null,
      author_username: author?.username ?? null,
    };
  });
}

export async function getCommentsForProgress(progressId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("progress_id", progressId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return hydrateAuthors(data);
}

export async function getCommentsForProgressIds(progressIds: string[]): Promise<CommentWithAuthor[]> {
  if (progressIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .in("progress_id", progressIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return hydrateAuthors(data);
}

export async function addComment(progressId: string, content: string): Promise<CommentWithAuthor> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ progress_id: progressId, user_id: user.id, content })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const [hydrated] = await hydrateAuthors([data]);
  return hydrated;
}
