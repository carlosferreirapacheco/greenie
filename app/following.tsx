import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getFollowing, getPendingFollowRequests } from "../lib/supabase/follows";
import { type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

function ProfileRow({ profile, fonts }: { profile: Profile; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.line }]} onPress={() => router.push(`/user/${profile.id}`)}>
      <PhotoThumb uri={profile.avatar_url} size={44} radius={radius.sm} />
      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
        {profile.display_name ?? `@${profile.username}`}
      </Text>
    </Pressable>
  );
}

export default function FollowingScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchFollowing = useCallback(() => {
    getFollowing()
      .then((data) => {
        setFollowing(data);
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
      fetchFollowing();
    }, [fetchFollowing])
  );

  const screen = (
    <Stack.Screen
      options={{
        title: t("following.screenTitle"),
        headerRight: () => (
          <View style={styles.headerRightRow}>
            <Pressable onPress={() => router.push("/follow-requests")} hitSlop={8} style={styles.badgeWrap}>
              <Text style={[styles.searchButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
                {t("following.headerActions.requests")}
              </Text>
              {hasPendingRequests ? <View style={[styles.badgeDot, { backgroundColor: colors.coral }]} /> : null}
            </Pressable>
            <Pressable onPress={() => router.push("/followers")} hitSlop={8}>
              <Text style={[styles.searchButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
                {t("following.headerActions.followers")}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/search-users")} hitSlop={8} style={styles.searchButtonWrap}>
              <Text style={[styles.searchButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
                {t("following.headerActions.search")}
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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("following.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (following.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("following.emptyState")}</Text>
      </View>
    );
  }

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredFollowing =
    trimmedQuery.length === 0
      ? following
      : following.filter((person) => (person.display_name ?? "").toLowerCase().includes(trimmedQuery));

  let body: ReactNode;
  if (filteredFollowing.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>
          {t("following.noMatch", { query: searchQuery.trim() })}
        </Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        style={styles.list}
        data={filteredFollowing}
        keyExtractor={(person) => person.id}
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
        placeholder={t("following.searchPlaceholder")}
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
  name: {
    fontSize: 16,
  },
});
