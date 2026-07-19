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
import {
  effectiveCommentPolicy,
  getProgressReport,
  updateProgressReportSettings,
  type CommentPolicy,
  type FeedItem,
} from "../../lib/supabase/plant_progress";
import { ChipGroup } from "../../components/ChipGroup";
import { likeProgress, unlikeProgress } from "../../lib/supabase/likes";
import { addComment, getCommentsForProgress, type CommentWithAuthor } from "../../lib/supabase/comments";
import { plantCommonNameSubtitle, plantPrimaryName, updatePlantPhoto } from "../../lib/supabase/plants";
import { getFollowStatus } from "../../lib/supabase/follows";
import { deletePhotoByUrl } from "../../lib/supabase/storage";
import { supabase } from "../../lib/supabase/client";
import { PhotoThumb } from "../../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { splitTemplate } from "../../lib/i18n";
import { getErrorMessage } from "../../lib/errors";
import { formatDisplayDate } from "../../lib/dateFormat";

export default function ProgressDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const toggling = useRef(false);

  const [canComment, setCanComment] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isPlantOwner, setIsPlantOwner] = useState(false);

  const [setPhotoStatus, setSetPhotoStatus] = useState<"idle" | "saving" | "error">("idle");
  const [setPhotoError, setSetPhotoError] = useState<string | null>(null);
  const isSettingPhoto = useRef(false);

  const [commentText, setCommentText] = useState("");
  const [postStatus, setPostStatus] = useState<"idle" | "posting" | "error">("idle");
  const [postError, setPostError] = useState<string | null>(null);
  const isPosting = useRef(false);

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const isSavingSettings = useRef(false);

  const fetchData = useCallback(() => {
    if (!id) {
      return;
    }
    Promise.all([
      getProgressReport(id),
      getCommentsForProgress(id),
      supabase.auth.getUser().then(({ data }) => data.user?.id),
    ])
      .then(async ([reportData, commentsData, currentUserId]) => {
        setReport(reportData);
        setLiked(reportData.liked_by_me);
        setLikeCount(reportData.like_count);
        setComments(commentsData);
        setIsOwner(reportData.user_id === currentUserId);
        setIsPlantOwner(reportData.plant_owner_id === currentUserId);

        // The report's own comment_policy (per-report since migration
        // 0012). 'disabled' silences everyone, the owner included.
        if (reportData.comment_policy === "disabled") {
          setCanComment(false);
        } else if (reportData.user_id === currentUserId) {
          setCanComment(true);
        } else if (reportData.comment_policy === "public") {
          setCanComment(true);
        } else {
          const followStatus = await getFollowStatus(reportData.user_id);
          setCanComment(followStatus === "accepted");
        }

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

  // Chips save immediately (same spirit as other inline owner edits);
  // comments are refetched because toggling 'disabled' changes what RLS
  // lets this session read.
  async function handleUpdateSettings(patch: { comment_policy?: CommentPolicy; shared_to_feed?: boolean }) {
    if (!report || isSavingSettings.current) {
      return;
    }
    isSavingSettings.current = true;
    setSettingsError(null);

    try {
      const nextSharedToFeed = patch.shared_to_feed ?? report.shared_to_feed;
      const updated = await updateProgressReportSettings(report.id, {
        comment_policy: effectiveCommentPolicy(nextSharedToFeed, patch.comment_policy ?? report.comment_policy),
        shared_to_feed: nextSharedToFeed,
      });
      setReport({ ...report, comment_policy: updated.comment_policy, shared_to_feed: updated.shared_to_feed });
      setCanComment(updated.comment_policy !== "disabled");
      setComments(await getCommentsForProgress(report.id));
    } catch (err) {
      setSettingsError(getErrorMessage(err));
    } finally {
      isSavingSettings.current = false;
    }
  }

  async function handleSetAsPlantPhoto() {
    if (!report?.photo_url || isSettingPhoto.current) {
      return;
    }
    isSettingPhoto.current = true;
    setSetPhotoStatus("saving");
    setSetPhotoError(null);

    try {
      await updatePlantPhoto(report.plant_id, report.photo_url);
      if (report.plant_photo_url) {
        await deletePhotoByUrl(report.plant_photo_url);
      }
      setReport({ ...report, plant_photo_url: report.photo_url });
      setSetPhotoStatus("idle");
    } catch (err) {
      setSetPhotoError(getErrorMessage(err));
      setSetPhotoStatus("error");
    } finally {
      isSettingPhoto.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("progress.headerTitle") }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error" || !report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("progress.headerTitle") }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>
          {t("progress.errorPrefix", { error: error ?? "" })}
        </Text>
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
            <PhotoThumb uri={report.author_avatar_url} size={28} radius={radius.sm} />
            <Text style={[styles.authorName, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
              {report.author_display_name ?? `@${report.author_username}`}
            </Text>
          </Pressable>
          <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {formatDisplayDate(report.created_at)}
          </Text>
        </View>

        <Text style={[styles.plantLine, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {(() => {
            const hasOwner = report.user_id !== report.plant_owner_id;
            const segments = splitTemplate(
              t(hasOwner ? "feed.plantLine.sentence" : "feed.plantLine.sentenceNoOwner"),
              ["owner", "plant"]
            );
            return segments.map((segment, index) => {
              if (typeof segment === "string") {
                return <Text key={index}>{segment}</Text>;
              }
              if (segment.token === "owner") {
                return (
                  <Text
                    key={index}
                    onPress={() => router.push(`/user/${report.plant_owner_id}`)}
                    style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}
                  >
                    {report.plant_owner_display_name ?? `@${report.plant_owner_username}`}
                  </Text>
                );
              }
              return (
                <Text key={index}>
                  <Text style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>{plantPrimary}</Text>
                  {plantCommonName || report.plant_species ? (
                    <Text>
                      {" ("}
                      {plantCommonName ? (
                        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft }}>
                          {plantCommonName}
                        </Text>
                      ) : null}
                      {plantCommonName && report.plant_species ? ", " : ""}
                      {report.plant_species ? (
                        <Text style={{ fontFamily: fonts.displayItalic }}>{report.plant_species}</Text>
                      ) : null}
                      {")"}
                    </Text>
                  ) : null}
                </Text>
              );
            });
          })()}
        </Text>

        {report.photo_url ? (
          <>
            <PhotoThumb uri={report.photo_url} size={220} radius={radius.md} />
            {isPlantOwner && report.photo_url !== report.plant_photo_url ? (
              <Pressable onPress={handleSetAsPlantPhoto} disabled={setPhotoStatus === "saving"} hitSlop={8}>
                {setPhotoStatus === "saving" ? (
                  <ActivityIndicator color={colors.moss} />
                ) : (
                  <Text style={[styles.setPhotoLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                    {t("progress.setAsPlantPhoto")}
                  </Text>
                )}
              </Pressable>
            ) : null}
            {setPhotoStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{setPhotoError}</Text>
            ) : null}
          </>
        ) : null}

        {report.notes ? (
          <Text style={[styles.notes, { fontFamily: fonts.body, color: colors.ink }]}>{report.notes}</Text>
        ) : null}

        {report.height_cm !== null ? (
          <Text style={[styles.height, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {t("common.heightUnit", { height: report.height_cm })}
          </Text>
        ) : null}

        <View style={styles.likeRow}>
          <Pressable onPress={handleToggleLike} disabled={isToggling} hitSlop={8}>
            <Text
              style={[
                styles.likeButton,
                { fontFamily: fonts.bodyMedium, color: liked ? colors.coral : colors.inkSoft },
              ]}
            >
              {liked ? t("feed.like.liked") : t("feed.like.unliked")}
            </Text>
          </Pressable>
          {likeCount > 0 ? (
            <Pressable onPress={() => router.push(`/likes/${id}`)} hitSlop={8}>
              <Text style={[styles.likeButton, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                ({likeCount})
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isOwner ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.line }]} />

            <View style={styles.ownerSetting}>
              <Text style={[styles.ownerSettingLabel, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("progress.ownerSettings.commentsLabel")}
              </Text>
              <ChipGroup
                fonts={fonts}
                value={report.comment_policy}
                onChange={(value) => handleUpdateSettings({ comment_policy: value })}
                disabled={!report.shared_to_feed}
                options={[
                  { value: "public", label: t("common.chipOptions.commentPolicy.anyone") },
                  { value: "followers", label: t("common.chipOptions.commentPolicy.followersOnly") },
                  { value: "disabled", label: t("common.chipOptions.commentPolicy.off") },
                ]}
              />
            </View>

            <View style={styles.ownerSetting}>
              <Text style={[styles.ownerSettingLabel, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("progress.ownerSettings.feedLabel")}
              </Text>
              {report.user_id !== report.plant_owner_id && !report.plant_owner_share_allowed ? (
                <Text style={[styles.settingHint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                  {t("progress.ownerSettings.sitterShareBlockedHint")}
                </Text>
              ) : (
                <>
                  <ChipGroup
                    fonts={fonts}
                    value={report.shared_to_feed ? "share" : "unlisted"}
                    onChange={(value) => handleUpdateSettings({ shared_to_feed: value === "share" })}
                    disabled={!report.shared_to_feed}
                    options={[
                      { value: "share", label: t("common.chipOptions.feedSharing.shareToFeed") },
                      { value: "unlisted", label: t("common.chipOptions.feedSharing.dontShare") },
                    ]}
                  />
                  {!report.shared_to_feed ? (
                    <Text style={[styles.settingHint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                      {t("progress.ownerSettings.unlistedLockHint")}
                    </Text>
                  ) : null}
                </>
              )}
            </View>

            {settingsError ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {settingsError}
              </Text>
            ) : null}
          </>
        ) : null}

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        {report.comment_policy === "disabled" ? (
          <Text style={[styles.commentsClosedText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("progress.commentsOffNotice")}
          </Text>
        ) : (
          <>
            <Text style={[styles.commentsHeading, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
              {comments.length > 0
                ? t(comments.length === 1 ? "feed.comments.countOne" : "feed.comments.countMany", {
                    count: comments.length,
                  })
                : t("feed.comments.none")}
            </Text>

            {comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <Pressable onPress={() => router.push(`/user/${comment.user_id}`)}>
                  <Text style={[styles.commentAuthor, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                    {comment.author_display_name ?? `@${comment.author_username}`}
                  </Text>
                </Pressable>
                <Text style={[styles.commentContent, { fontFamily: fonts.body, color: colors.ink }]}>
                  {comment.content}
                </Text>
                <Text style={[styles.commentTimestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                  {formatDisplayDate(comment.created_at)}
                </Text>
              </View>
            ))}

            {canComment ? (
              <View style={styles.field}>
                <TextInput
                  style={[
                    styles.input,
                    styles.commentInput,
                    { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line },
                  ]}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder={t("progress.commentInputPlaceholder")}
                  placeholderTextColor={colors.inkSoft}
                  multiline
                />
                {postStatus === "error" ? (
                  <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                    {postError}
                  </Text>
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
                      {t("progress.postButton")}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.commentsClosedText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                {t("progress.followersOnlyNotice")}
              </Text>
            )}
          </>
        )}
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
  setPhotoLink: {
    fontSize: 13,
    marginTop: 4,
  },
  height: {
    fontSize: 13,
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  likeButton: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
  commentsClosedText: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  ownerSetting: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ownerSettingLabel: {
    fontSize: 13,
  },
  settingHint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
