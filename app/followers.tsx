import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getFollowers, removeFollower } from "../lib/supabase/follows";
import { type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

function FollowerRow({
  profile,
  fonts,
  busy,
  onRemovePress,
}: {
  profile: Profile;
  fonts: ReturnType<typeof getFonts>;
  busy: boolean;
  onRemovePress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.profileLink} onPress={() => router.push(`/user/${profile.id}`)}>
        <PhotoThumb uri={profile.avatar_url} size={44} radius={radius.sm} />
        <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
          {profile.display_name ?? `@${profile.username}`}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={colors.coral} />
        ) : (
          <Pressable onPress={onRemovePress} hitSlop={8}>
            <Text style={[styles.actionLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
              {t("followers.row.remove")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Who follows me, with the option to remove them -- backed by the same
// follows_delete_by_followee RLS delete as declining a request. Removal
// is silent for the other person: they simply stop following (and under
// a request policy would have to re-request).
export default function FollowersScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Profile | null>(null);
  const busyRef = useRef<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchFollowers = useCallback(() => {
    getFollowers()
      .then((data) => {
        setFollowers(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFollowers();
    }, [fetchFollowers])
  );

  async function handleRemove(followerId: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = followerId;
    setBusyId(followerId);
    setActionError(null);

    try {
      await removeFollower(followerId);
      setFollowers((prev) => prev.filter((profile) => profile.id !== followerId));
      setPendingRemoval(null);
    } catch (err) {
      // Leaves pendingRemoval set -- the modal stays open with the error
      // shown inline instead of silently vanishing.
      setActionError(getErrorMessage(err));
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }

  const screen = <Stack.Screen options={{ title: t("followers.screenTitle") }} />;

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("followers.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (followers.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("followers.emptyState")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
      <FlatList
        style={styles.list}
        data={followers}
        keyExtractor={(profile) => profile.id}
        renderItem={({ item }) => (
          <FollowerRow
            profile={item}
            fonts={fonts}
            busy={busyId === item.id}
            onRemovePress={() => setPendingRemoval(item)}
          />
        )}
      />

      {pendingRemoval ? (
        <ConfirmModal
          message={t("followers.confirmRemove.message", {
            name: pendingRemoval.display_name ?? `@${pendingRemoval.username}`,
          })}
          actions={[
            { label: t("followers.row.remove"), tone: "destructive", onPress: () => handleRemove(pendingRemoval.id) },
          ]}
          onCancel={() => setPendingRemoval(null)}
          busy={busyId === pendingRemoval.id}
          errorText={actionError}
          fonts={fonts}
        />
      ) : null}
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
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionLink: {
    fontSize: 14,
  },
});
