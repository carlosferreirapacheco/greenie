import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getFriends } from "../lib/supabase/follows";
import { type Profile } from "../lib/supabase/profiles";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";

export default function FriendsScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const fetchFriends = useCallback(() => {
    getFriends()
      .then((data) => {
        setFriends(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [fetchFriends])
  );

  const screen = <Stack.Screen options={{ title: "Friends" }} />;

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

  if (friends.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>No friends yet</Text>
      </View>
    );
  }

  return (
    <>
      {screen}
      <FlatList
        style={[styles.list, { backgroundColor: colors.paper }]}
        data={friends}
        keyExtractor={(friend) => friend.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { borderBottomColor: colors.line }]}
            onPress={() => router.push(`/user/${item.id}`)}
          >
            <View style={[styles.thumb, { backgroundColor: colors.sage }]} />
            <Text
              style={[
                styles.name,
                { fontFamily: fonts.display, color: item.display_name ? colors.ink : colors.inkSoft },
              ]}
            >
              {item.display_name ?? "No display name yet"}
            </Text>
          </Pressable>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  name: {
    fontSize: 16,
  },
});
