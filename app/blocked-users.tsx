import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getBlockedUsers, unblockUser } from "../lib/supabase/blocks";
import { type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

function BlockedRow({
  profile,
  fonts,
  busy,
  onUnblock,
}: {
  profile: Profile;
  fonts: ReturnType<typeof getFonts>;
  busy: boolean;
  onUnblock: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.profileLink} onPress={() => router.push(`/user/${profile.id}`)}>
        <PhotoThumb uri={profile.avatar_url} size={44} radius={radius.sm} />
        <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
          {profile.display_name ?? `@${profile.username}`}
        </Text>
      </Pressable>
      <Pressable onPress={onUnblock} disabled={busy} hitSlop={8}>
        {busy ? (
          <ActivityIndicator color={colors.moss} />
        ) : (
          <Text style={[styles.actionLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Unblock</Text>
        )}
      </Pressable>
    </View>
  );
}

// Unblock is a single immediate tap, unlike Remove follower's two-tap
// confirm -- it's low-stakes and instantly reversible (re-blocking is
// one tap too), so no confirm step.
export default function BlockedUsersScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const fetchBlockedUsers = useCallback(() => {
    getBlockedUsers()
      .then((data) => {
        setBlockedUsers(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBlockedUsers();
    }, [fetchBlockedUsers])
  );

  async function handleUnblock(userId: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = userId;
    setBusyId(userId);
    setActionError(null);

    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((profile) => profile.id !== userId));
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }

  const screen = <Stack.Screen options={{ title: "Blocked Users" }} />;

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

  if (blockedUsers.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>No blocked users</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
      {actionError ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{actionError}</Text>
      ) : null}
      <FlatList
        style={styles.list}
        data={blockedUsers}
        keyExtractor={(profile) => profile.id}
        renderItem={({ item }) => (
          <BlockedRow
            profile={item}
            fonts={fonts}
            busy={busyId === item.id}
            onUnblock={() => handleUnblock(item.id)}
          />
        )}
      />
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
  errorText: {
    fontSize: 13,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
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
  profileLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    fontSize: 16,
    flexShrink: 1,
  },
  actionLink: {
    fontSize: 14,
  },
});
