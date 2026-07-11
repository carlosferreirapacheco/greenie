import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getFriends, getPendingFollowRequests } from "../lib/supabase/follows";
import { type Profile } from "../lib/supabase/profiles";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { getErrorMessage } from "../lib/errors";

function ProfileRow({ profile, fonts }: { profile: Profile; fonts: ReturnType<typeof getFonts> }) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.line }]} onPress={() => router.push(`/user/${profile.id}`)}>
      <View style={[styles.thumb, { backgroundColor: colors.sage }]} />
      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
        {profile.display_name ?? `@${profile.username}`}
      </Text>
    </Pressable>
  );
}

export default function FriendsScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const fetchFriends = useCallback(() => {
    getFriends()
      .then((data) => {
        setFriends(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
    getPendingFollowRequests()
      .then((requests) => setHasPendingRequests(requests.length > 0))
      .catch(() => {
        // Non-critical -- the badge just won't show if this fails.
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [fetchFriends])
  );

  const screen = (
    <Stack.Screen
      options={{
        title: "Following",
        headerRight: () => (
          <View style={styles.headerRightRow}>
            <Pressable onPress={() => router.push("/follow-requests")} hitSlop={8} style={styles.badgeWrap}>
              <Text style={[styles.searchButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
                Requests
              </Text>
              {hasPendingRequests ? <View style={[styles.badgeDot, { backgroundColor: colors.coral }]} /> : null}
            </Pressable>
            <Pressable onPress={() => router.push("/followers")} hitSlop={8}>
              <Text style={[styles.searchButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
                Followers
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/search-users")} hitSlop={8} style={styles.searchButtonWrap}>
              <Text style={[styles.searchButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
                Search
              </Text>
            </Pressable>
          </View>
        ),
      }}
    />
  );

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
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>Not following anyone yet</Text>
      </View>
    );
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredFriends =
    trimmedQuery.length === 0
      ? friends
      : friends.filter((friend) => (friend.display_name ?? "").toLowerCase().includes(trimmedQuery));

  let body: ReactNode;
  if (filteredFriends.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>
          No one you follow matches "{searchQuery.trim()}"
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        style={styles.list}
        data={filteredFriends}
        keyExtractor={(friend) => friend.id}
        renderItem={({ item }) => <ProfileRow profile={item} fonts={fonts} />}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
      <TextInput
        style={[styles.filterInput, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search people you follow"
        placeholderTextColor={colors.inkSoft}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  searchButtonWrap: {},
  badgeWrap: {
    position: "relative",
    paddingRight: 8,
  },
  badgeDot: {
    position: "absolute",
    top: -2,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchButton: {
    fontSize: 15,
  },
  filterInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
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
