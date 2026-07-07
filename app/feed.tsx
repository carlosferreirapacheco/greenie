import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getFeed, type FeedItem } from "../lib/supabase/plant_progress";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function FeedRow({ item, fonts }: { item: FeedItem; fonts: ReturnType<typeof getFonts> }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.author} onPress={() => router.push(`/user/${item.user_id}`)}>
        <View style={[styles.avatar, { backgroundColor: colors.sage }]} />
        <Text
          style={[
            styles.authorName,
            { fontFamily: fonts.bodyMedium, color: item.author_display_name ? colors.ink : colors.inkSoft },
          ]}
        >
          {item.author_display_name ?? "No display name yet"}
        </Text>
        <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {dateFormatter.format(new Date(item.created_at))}
        </Text>
      </Pressable>

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
    gap: spacing.xs,
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  authorName: {
    fontSize: 14,
    flex: 1,
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
});
