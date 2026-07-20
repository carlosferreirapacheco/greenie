import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { searchProfiles, type Profile } from "../lib/supabase/profiles";
import { followUser, getFollowStatus, unfollowUser, type FollowStatus } from "../lib/supabase/follows";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

function AddButton({
  profileId,
  status,
  onStatusChange,
  fonts,
}: {
  profileId: string;
  status: FollowStatus;
  onStatusChange: (status: FollowStatus) => void;
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  // Same synchronous-guard pattern as app/user/[id].tsx's follow toggle.
  const toggling = useRef(false);

  async function handlePress() {
    if (toggling.current) {
      return;
    }
    toggling.current = true;
    setBusy(true);

    try {
      if (status === "none") {
        const { status: newStatus } = await followUser(profileId);
        onStatusChange(newStatus);
      } else {
        await unfollowUser(profileId);
        onStatusChange("none");
      }
    } catch {
      // Low-stakes inline action -- a failed toggle just leaves the
      // button in its previous state for the user to retry.
    } finally {
      toggling.current = false;
      setBusy(false);
    }
  }

  const label =
    status === "none"
      ? t("searchUsers.addButton.add")
      : status === "pending"
        ? t("userProfile.followButton.requested")
        : t("searchUsers.addButton.following");

  return (
    <Pressable
      style={[
        styles.addButton,
        status === "none"
          ? { backgroundColor: colors.moss }
          : { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
      ]}
      onPress={handlePress}
      disabled={busy}
      hitSlop={8}
    >
      {busy ? (
        <ActivityIndicator size="small" color={status === "none" ? colors.paper : colors.inkSoft} />
      ) : (
        <Text
          style={[
            styles.addButtonText,
            { fontFamily: fonts.bodySemiBold, color: status === "none" ? colors.paper : colors.inkSoft },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function ProfileRow({
  profile,
  fonts,
  followStatus,
  onStatusChange,
}: {
  profile: Profile;
  fonts: ReturnType<typeof getFonts>;
  followStatus: FollowStatus | undefined;
  onStatusChange: (status: FollowStatus) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.rowMain} onPress={() => router.push(`/user/${profile.id}`)}>
        <PhotoThumb uri={profile.avatar_url} size={44} radius={radius.sm} />
        <View style={styles.nameColumn}>
          <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
            {profile.display_name ?? `@${profile.username}`}
          </Text>
          {profile.display_name ? (
            <Text style={[styles.username, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              @{profile.username}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {followStatus ? (
        <AddButton profileId={profile.id} status={followStatus} onStatusChange={onStatusChange} fonts={fonts} />
      ) : null}
    </View>
  );
}

export default function SearchUsersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [followStatuses, setFollowStatuses] = useState<Record<string, FollowStatus>>({});

  // Guards against a slower earlier search response overwriting a faster
  // later one when typing quickly.
  const latestQuery = useRef("");

  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    latestQuery.current = text;

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setSearchStatus("idle");
      setSearchResults([]);
      return;
    }

    setSearchStatus("loading");
    setSearchError(null);

    searchProfiles(trimmed)
      .then((data) => {
        if (latestQuery.current !== text) {
          return;
        }
        setSearchResults(data);
        setSearchStatus("idle");
      })
      .catch((err) => {
        if (latestQuery.current !== text) {
          return;
        }
        setSearchError(getErrorMessage(err));
        setSearchStatus("error");
      });
  }

  // Each visible result's follow state is fetched once results land --
  // there's no batch status endpoint, and search result pages are short.
  useEffect(() => {
    let cancelled = false;
    Promise.all(searchResults.map((profile) => getFollowStatus(profile.id).then((status) => [profile.id, status] as const)))
      .then((entries) => {
        if (cancelled) {
          return;
        }
        setFollowStatuses((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      })
      .catch(() => {
        // Non-critical -- rows without a resolved status just hide the
        // Add button until the next search.
      });
    return () => {
      cancelled = true;
    };
  }, [searchResults]);

  let body: ReactNode;

  if (searchStatus === "loading") {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  } else if (searchStatus === "error") {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("searchUsers.error", { error: searchError ?? "" })}</Text>
      </View>
    );
  } else if (searchQuery.trim().length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("searchUsers.promptState")}</Text>
      </View>
    );
  } else if (searchResults.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("searchUsers.emptyState")}</Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        style={styles.list}
        data={searchResults}
        keyExtractor={(profile) => profile.id}
        renderItem={({ item }) => (
          <ProfileRow
            profile={item}
            fonts={fonts}
            followStatus={followStatuses[item.id]}
            onStatusChange={(status) => setFollowStatuses((prev) => ({ ...prev, [item.id]: status }))}
          />
        )}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen options={{ title: t("searchUsers.screenTitle") }} />
      <View style={[styles.searchInputWrap, { borderColor: colors.line }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.inkSoft} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { fontFamily: fonts.body, color: colors.ink }]}
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder={t("searchUsers.placeholder")}
          placeholderTextColor={colors.inkSoft}
          autoFocus
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
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
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
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  nameColumn: {
    gap: 1,
  },
  name: {
    fontSize: 16,
  },
  username: {
    fontSize: 12,
  },
  addButton: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 13,
  },
});
