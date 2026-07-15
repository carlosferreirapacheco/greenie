import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import { searchProfiles, type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

function ProfileRow({ profile, fonts }: { profile: Profile; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.line }]} onPress={() => router.push(`/user/${profile.id}`)}>
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
  );
}

export default function SearchUsersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  // Guards against a slower earlier search response overwriting a faster
  // later one when typing quickly.
  const latestQuery = useRef("");

  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {searchError}</Text>
      </View>
    );
  } else if (searchQuery.trim().length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>Type a name or username to search</Text>
      </View>
    );
  } else if (searchResults.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>No users found</Text>
      </View>
    );
  } else {
    body = (
      <FlatList
        style={styles.list}
        data={searchResults}
        keyExtractor={(profile) => profile.id}
        renderItem={({ item }) => <ProfileRow profile={item} fonts={fonts} />}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <Stack.Screen options={{ title: "Search Users" }} />
      <TextInput
        style={[styles.searchInput, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search users by name or username"
        placeholderTextColor={colors.inkSoft}
        autoFocus
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
});
