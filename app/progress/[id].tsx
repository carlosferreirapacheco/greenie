import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProgressReport, type FeedItem } from "../../lib/supabase/plant_progress";
import { likeProgress, unlikeProgress } from "../../lib/supabase/likes";
import { addComment, getCommentsForProgress, type CommentWithAuthor } from "../../lib/supabase/comments";
import { plantCommonNameSubtitle, plantPrimaryName } from "../../lib/supabase/plants";
import { colors, fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { getErrorMessage } from "../../lib/errors";

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export default function ProgressDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const toggling = useRef(false);

  const [commentText, setCommentText] = useState("");
  const [postStatus, setPostStatus] = useState<"idle" | "posting" | "error">("idle");
  const [postError, setPostError] = useState<string | null>(null);
  const isPosting = useRef(false);

  const fetchData = useCallback(() => {
    if (!id) {
      return;
    }
    Promise.all([getProgressReport(id), getCommentsForProgress(id)])
      .then(([reportData, commentsData]) => {
        setReport(reportData);
        setLiked(reportData.liked_by_me);
        setLikeCount(reportData.like_count);
        setComments(commentsData);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  async function handleToggleLike() {
    if (!id || toggling.current) {
      return;
    }
    toggling.current = true;
    setIsToggling(true);

    try {
      if (liked) {
        await unlikeProgress(id);
        setLiked(false);
        setLikeCount((count) => count - 1);
      } else {
        await likeProgress(id);
        setLiked(true);
        setLikeCount((count) => count + 1);
      }
    } catch {
      // Low-stakes toggle -- leave state as-is on failure, user can retry.
    } finally {
      toggling.current = false;
      setIsToggling(false);
    }
  }

  async function handlePostComment() {
    const trimmed = commentText.trim();
    if (!id || trimmed.length === 0 || isPosting.current) {
      return;
    }
    isPosting.current = true;

    setPostStatus("posting");
    setPostError(null);

    try {
      const comment = await addComment(id, trimmed);
      setComments((prev) => [...prev, comment]);
      setCommentText("");
      setPostStatus("idle");
    } catch (err) {
      setPostError(getErrorMessage(err));
      setPostStatus("error");
    } finally {
      isPosting.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Progress" }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error" || !report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Progress" }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  const plantPrimary = plantPrimaryName({ name: report.plant_name, nickname: report.plant_nickname });
  const plantCommonName = plantCommonNameSubtitle({ name: report.plant_name, nickname: report.plant_nickname });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: plantPrimary }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.author}>
          <Pressable style={styles.authorLink} onPress={() => router.push(`/user/${report.user_id}`)} hitSlop={4}>
            <View style={[styles.avatar, { backgroundColor: colors.sage }]} />
            <Text
              style={[
                styles.authorName,
                { fontFamily: fonts.bodyMedium, color: report.author_display_name ? colors.ink : colors.inkSoft },
              ]}
            >
              {report.author_display_name ?? "No display name yet"}
            </Text>
          </Pressable>
          <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {dateFormatter.format(new Date(report.created_at))}
          </Text>
        </View>

        <Text style={[styles.plantLine, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          Logged progress on{" "}
          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>{plantPrimary}</Text>
          {plantCommonName || report.plant_species ? (
            <Text>
              {" ("}
              {plantCommonName ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft }}>{plantCommonName}</Text>
              ) : null}
              {plantCommonName && report.plant_species ? ", " : ""}
              {report.plant_species ? (
                <Text style={{ fontFamily: fonts.displayItalic }}>{report.plant_species}</Text>
              ) : null}
              {")"}
            </Text>
          ) : null}
        </Text>

        {report.notes ? (
          <Text style={[styles.notes, { fontFamily: fonts.body, color: colors.ink }]}>{report.notes}</Text>
        ) : null}

        {report.height_cm !== null ? (
          <Text style={[styles.height, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {report.height_cm} cm
          </Text>
        ) : null}

        <Pressable onPress={handleToggleLike} disabled={isToggling} hitSlop={8}>
          <Text
            style={[styles.likeButton, { fontFamily: fonts.bodyMedium, color: liked ? colors.coral : colors.inkSoft }]}
          >
            {liked ? "♥ Liked" : "♡ Like"}
            {likeCount > 0 ? ` (${likeCount})` : ""}
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={[styles.commentsHeading, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "No comments yet"}
        </Text>

        {comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <Pressable onPress={() => router.push(`/user/${comment.user_id}`)}>
              <Text
                style={[
                  styles.commentAuthor,
                  { fontFamily: fonts.bodyMedium, color: comment.author_display_name ? colors.ink : colors.inkSoft },
                ]}
              >
                {comment.author_display_name ?? "No display name yet"}
              </Text>
            </Pressable>
            <Text style={[styles.commentContent, { fontFamily: fonts.body, color: colors.ink }]}>
              {comment.content}
            </Text>
            <Text style={[styles.commentTimestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              {dateFormatter.format(new Date(comment.created_at))}
            </Text>
          </View>
        ))}

        <View style={styles.field}>
          <TextInput
            style={[
              styles.input,
              styles.commentInput,
              { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line },
            ]}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment"
            placeholderTextColor={colors.inkSoft}
            multiline
          />
          {postStatus === "error" ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{postError}</Text>
          ) : null}
          <Pressable
            style={[
              styles.postButton,
              { backgroundColor: commentText.trim().length > 0 ? colors.moss : colors.line },
            ]}
            onPress={handlePostComment}
            disabled={commentText.trim().length === 0}
          >
            {postStatus === "posting" ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <Text style={[styles.postButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                Post
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  authorLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  authorName: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
  },
  plantLine: {
    fontSize: 14,
  },
  notes: {
    fontSize: 15,
    lineHeight: 21,
  },
  height: {
    fontSize: 13,
  },
  likeButton: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  commentsHeading: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  comment: {
    marginBottom: spacing.sm,
  },
  commentAuthor: {
    fontSize: 13,
  },
  commentContent: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  commentTimestamp: {
    fontSize: 11,
    marginTop: 1,
  },
  field: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
  },
  commentInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 13,
  },
  postButton: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  postButtonText: {
    fontSize: 15,
  },
});
