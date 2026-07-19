import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, useFocusEffect } from "expo-router";
import { getFeed, type FeedItem } from "../../lib/supabase/plant_progress";
import { likeProgress, unlikeProgress } from "../../lib/supabase/likes";
import { plantCommonNameSubtitle, plantPrimaryName } from "../../lib/supabase/plants";
import { PhotoThumb } from "../../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { getErrorMessage } from "../../lib/errors";
import { formatDisplayDate } from "../../lib/dateFormat";

// Splits a translated sentence template on its {token} markers so each
// piece can render as its own JSX node (a plain Text run, or a nested
// pressable) -- needed because "Logged progress on {owner}'s {plant}"
// and its Portuguese equivalent "Registou progresso na planta {plant}
// de {owner}" put the same two tokens in a different order, so the
// sentence can't be built from fixed-position English word order.
function splitTemplate(template: string, tokens: string[]): (string | { token: string })[] {
  const pattern = new RegExp(`(${tokens.map((tok) => `\\{${tok}\\}`).join("|")})`, "g");
  return template
    .split(pattern)
    .filter((part) => part !== "")
    .map((part) => {
      const match = tokens.find((tok) => part === `{${tok}}`);
      return match ? { token: match } : part;
    });
}

function FeedRow({ item, fonts }: { item: FeedItem; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likeCount, setLikeCount] = useState(item.like_count);
  const [isToggling, setIsToggling] = useState(false);

  // Same synchronous-guard pattern as the Follow button (app/user/[id].tsx).
  const toggling = useRef(false);

  const plantPrimary = plantPrimaryName({ name: item.plant_name, nickname: item.plant_nickname });
  const plantCommonName = plantCommonNameSubtitle({ name: item.plant_name, nickname: item.plant_nickname });

  async function handleToggleLike() {
    if (toggling.current) {
      return;
    }
    toggling.current = true;
    setIsToggling(true);

    try {
      if (liked) {
        await unlikeProgress(item.id);
        setLiked(false);
        setLikeCount((count) => count - 1);
      } else {
        await likeProgress(item.id);
        setLiked(true);
        setLikeCount((count) => count + 1);
      }
    } catch {
      // Feed likes are low-stakes; a failed toggle just leaves the
      // button in its previous state for the user to retry.
    } finally {
      toggling.current = false;
      setIsToggling(false);
    }
  }

  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <View style={styles.author}>
        <Pressable style={styles.authorLink} onPress={() => router.push(`/user/${item.user_id}`)} hitSlop={4}>
          <PhotoThumb uri={item.author_avatar_url} size={28} radius={radius.sm} />
          <Text style={[styles.authorName, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
            {item.author_display_name ?? `@${item.author_username}`}
          </Text>
        </Pressable>
        <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {formatDisplayDate(item.created_at)}
        </Text>
      </View>

      <Text style={[styles.plantLine, { fontFamily: fonts.body, color: colors.inkSoft }]}>
        {(() => {
          const hasOwner = item.user_id !== item.plant_owner_id;
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
                  onPress={() => router.push(`/user/${item.plant_owner_id}`)}
                  style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}
                >
                  {item.plant_owner_display_name ?? `@${item.plant_owner_username}`}
                </Text>
              );
            }
            return (
              <Text key={index}>
                <Text
                  onPress={() => router.push(`/plant/${item.plant_id}`)}
                  style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}
                >
                  {plantPrimary}
                </Text>
                {plantCommonName || item.plant_species ? (
                  <Text onPress={() => router.push(`/plant/${item.plant_id}`)}>
                    {" ("}
                    {plantCommonName ? (
                      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft }}>
                        {plantCommonName}
                      </Text>
                    ) : null}
                    {plantCommonName && item.plant_species ? ", " : ""}
                    {item.plant_species ? (
                      <Text style={{ fontFamily: fonts.displayItalic, color: colors.inkSoft }}>
                        {item.plant_species}
                      </Text>
                    ) : null}
                    {")"}
                  </Text>
                ) : null}
              </Text>
            );
          });
        })()}
      </Text>

      {item.notes ? (
        <Text style={[styles.notes, { fontFamily: fonts.body, color: colors.ink }]}>{item.notes}</Text>
      ) : null}

      {item.height_cm !== null ? (
        <Text style={[styles.height, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
          {t("feed.heightUnit", { height: item.height_cm })}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={handleToggleLike} disabled={isToggling} hitSlop={8}>
          <Text style={[styles.likeButton, { fontFamily: fonts.bodyMedium, color: liked ? colors.coral : colors.inkSoft }]}>
            {liked ? t("feed.like.liked") : t("feed.like.unliked")}
            {likeCount > 0 ? ` (${likeCount})` : ""}
          </Text>
        </Pressable>
        {item.comment_policy === "disabled" ? (
          <Text style={[styles.commentsLink, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("feed.comments.off")}
          </Text>
        ) : (
          <>
            <Pressable onPress={() => router.push(`/progress/${item.id}`)} hitSlop={8}>
              <Text style={[styles.commentsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {item.comment_count > 0
                  ? t(item.comment_count === 1 ? "feed.comments.countOne" : "feed.comments.countMany", {
                      count: item.comment_count,
                    })
                  : t("feed.comments.none")}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/progress/${item.id}`)} hitSlop={8}>
              <Text style={[styles.commentsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("feed.comments.add")}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {item.comment_policy !== "disabled" && item.latest_comment ? (
        <Text
          style={[styles.commentPreview, { fontFamily: fonts.body, color: colors.inkSoft }]}
          numberOfLines={1}
        >
          <Text style={{ fontFamily: fonts.bodyMedium }}>
            {item.latest_comment.author_display_name ?? `@${item.latest_comment.author_username}`}
          </Text>
          {": "}
          {item.latest_comment.content}
        </Text>
      ) : null}
    </View>
  );
}

export default function FeedScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Same synchronous-guard pattern as the like toggle below.
  const loadingMore = useRef(false);

  const fetchFeed = useCallback(() => {
    // A focus-refetch is a fresh look at current state, not a resume --
    // it replaces the list and cursor rather than appending onto them.
    getFeed()
      .then(({ items: data, nextCursor: cursor }) => {
        setItems(data);
        setNextCursor(cursor);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  const fetchMore = useCallback(() => {
    if (loadingMore.current || !nextCursor) {
      return;
    }
    loadingMore.current = true;
    setIsLoadingMore(true);

    getFeed({ before: nextCursor })
      .then(({ items: data, nextCursor: cursor }) => {
        setItems((prev) => [...prev, ...data]);
        setNextCursor(cursor);
      })
      .catch(() => {
        // Low-stakes background pagination fetch -- leave nextCursor as
        // it was so scrolling back down retries instead of surfacing a
        // separate footer error state.
      })
      .finally(() => {
        loadingMore.current = false;
        setIsLoadingMore(false);
      });
  }, [nextCursor]);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [fetchFeed])
  );

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("feed.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("feed.emptyState")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.list, { backgroundColor: colors.paper }]}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedRow item={item} fonts={fonts} />}
      onEndReached={fetchMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.moss} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  row: {
    gap: spacing.xs,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  height: {
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  likeButton: {
    fontSize: 13,
  },
  commentsLink: {
    fontSize: 13,
  },
  commentPreview: {
    fontSize: 13,
    marginTop: 2,
  },
});
