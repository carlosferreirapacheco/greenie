import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getFeed, type FeedItem } from "../lib/supabase/plant_progress";
import { likeProgress, unlikeProgress } from "../lib/supabase/likes";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function FeedRow({ item, fonts }: { item: FeedItem; fonts: ReturnType<typeof getFonts> }) {
  const [liked, setLiked] = useState(item.liked_by_me);
  const [likeCount, setLikeCount] = useState(item.like_count);
  const [isToggling, setIsToggling] = useState(false);

  // Same synchronous-guard pattern as the Follow button (app/user/[id].tsx).
  const toggling = useRef(false);

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
          <View style={[styles.avatar, { backgroundColor: colors.sage }]} />
          <Text
            style={[
              styles.authorName,
              { fontFamily: fonts.bodyMedium, color: item.author_display_name ? colors.ink : colors.inkSoft },
            ]}
          >
            {item.author_display_name ?? "No display name yet"}
          </Text>
        </Pressable>
        <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {dateFormatter.format(new Date(item.created_at))}
        </Text>
      </View>

      <Text style={[styles.plantLine, { fontFamily: fonts.body, color: colors.inkSoft }]}>
        Logged progress on{" "}
        <Text style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>{item.plant_name}</Text>
        {item.plant_species ? (
          <Text style={{ fontFamily: fonts.displayItalic }}> ({item.plant_species})</Text>
        ) : null}
      </Text>

      {item.notes ? (
        <Text style={[styles.notes, { fontFamily: fonts.body, color: colors.ink }]}>{item.notes}</Text>
      ) : null}

      {item.height_cm !== null ? (
        <Text style={[styles.height, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
          {item.height_cm} cm
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={handleToggleLike} disabled={isToggling} hitSlop={8}>
          <Text style={[styles.likeButton, { fontFamily: fonts.bodyMedium, color: liked ? colors.coral : colors.inkSoft }]}>
            {liked ? "♥ Liked" : "♡ Like"}
            {likeCount > 0 ? ` (${likeCount})` : ""}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/progress/${item.id}`)} hitSlop={8}>
          <Text style={[styles.commentsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {item.comment_count > 0
              ? `${item.comment_count} comment${item.comment_count === 1 ? "" : "s"}`
              : "Add a comment"}
          </Text>
        </Pressable>
      </View>

      {item.latest_comment ? (
        <Text
          style={[styles.commentPreview, { fontFamily: fonts.body, color: colors.inkSoft }]}
          numberOfLines={1}
        >
          <Text style={{ fontFamily: fonts.bodyMedium }}>
            {item.latest_comment.author_display_name ?? "No display name yet"}
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
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const fetchFeed = useCallback(() => {
    getFeed()
      .then((data) => {
        setItems(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [fetchFeed])
  );

  const screen = <Stack.Screen options={{ title: "Feed" }} />;

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>No activity yet</Text>
      </View>
    );
  }

  return (
    <>
      {screen}
      <FlatList
        style={[styles.list, { backgroundColor: colors.paper }]}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedRow item={item} fonts={fonts} />}
      />
    </>
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
