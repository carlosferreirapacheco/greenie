import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";
import { router, useFocusEffect, useNavigation } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { getFollowing, getPendingFollowRequests } from "../../lib/supabase/follows";
import { type Profile } from "../../lib/supabase/profiles";
import { PhotoThumb } from "../../components/PhotoThumb";
import { HeaderIconButton } from "../../components/HeaderIconButton";
import { fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { getErrorMessage } from "../../lib/errors";

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
  const navigation = useNavigation();

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

  // Header actions live here (not the tabs layout) because Requests
  // carries its own pending-request badge dot -- same reasoning as
  // plant-sitting.tsx's Share/Request actions. All three use the
  // icon+label HeaderIconButton treatment (not text links) so the row
  // stays narrow enough not to collide with the centered header title
  // on real phone screens -- three full-word text buttons was wide
  // enough to visually overlap the title on-device.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <HeaderIconButton
            icon="account-clock-outline"
            label={t("following.headerActions.requests")}
            onPress={() => router.push("/follow-requests")}
            fonts={fonts}
            badge={hasPendingRequests}
          />
          <HeaderIconButton
            icon="account-multiple-outline"
            label={t("following.headerActions.followers")}
            onPress={() => router.push("/followers")}
            fonts={fonts}
          />
          <HeaderIconButton
            icon="account-plus-outline"
            label={t("following.headerActions.add")}
            onPress={() => router.push("/search-users")}
            fonts={fonts}
          />
        </View>
      ),
    });
  }, [navigation, fonts, hasPendingRequests, t]);

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("following.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (following.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
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
      <View style={[styles.filterInputWrap, { borderColor: colors.line }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.inkSoft} style={styles.filterIcon} />
        <TextInput
          style={[styles.filterInput, { fontFamily: fonts.body, color: colors.ink }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("following.searchPlaceholder")}
          placeholderTextColor={colors.inkSoft}
        />
      </View>
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
    gap: spacing.xs,
  },
  filterInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  filterIcon: {
    marginRight: spacing.xs,
  },
  filterInput: {
    flex: 1,
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
