import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProfile, type Profile } from "../../lib/supabase/profiles";
import { followUser, isFollowing, unfollowUser } from "../../lib/supabase/follows";
import { supabase } from "../../lib/supabase/client";
import { colors, fontAssets, getFonts, radius, spacing } from "../../lib/theme";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [following, setFollowing] = useState(false);

  const [toggleStatus, setToggleStatus] = useState<"idle" | "toggling" | "error">("idle");
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx: state updates are
  // async, so a ref is needed to reliably block a second rapid tap.
  const isToggling = useRef(false);

  const fetchProfile = useCallback(() => {
    if (!id) {
      return;
    }

    Promise.all([
      getProfile(id),
      isFollowing(id),
      supabase.auth.getUser().then(({ data }) => data.user?.id),
    ])
      .then(([profileData, followingData, currentUserId]) => {
        setProfile(profileData);
        setFollowing(followingData);
        setIsOwnProfile(currentUserId === id);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  async function handleToggleFollow() {
    if (!id || isToggling.current) {
      return;
    }
    isToggling.current = true;

    setToggleStatus("toggling");
    setToggleError(null);

    try {
      if (following) {
        await unfollowUser(id);
        setFollowing(false);
      } else {
        await followUser(id);
        setFollowing(true);
      }
      setToggleStatus("idle");
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : String(err));
      setToggleStatus("error");
    } finally {
      isToggling.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Profile" }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Profile" }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  const displayName = profile?.display_name;
  const initial = (displayName ?? "?").charAt(0).toUpperCase();

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: displayName ?? "Profile" }} />
      <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
        <Text style={[styles.avatarText, { fontFamily: fonts.display, color: colors.mossStrong }]}>{initial}</Text>
      </View>

      <Text
        style={[styles.name, { fontFamily: fonts.display, color: displayName ? colors.ink : colors.inkSoft }]}
      >
        {displayName ?? "No display name yet"}
      </Text>

      <Text style={[styles.bio, { fontFamily: fonts.body, color: profile?.bio ? colors.ink : colors.inkSoft }]}>
        {profile?.bio ?? "No bio yet"}
      </Text>

      {!isOwnProfile ? (
        <Pressable
          style={[
            styles.followButton,
            following
              ? { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }
              : { backgroundColor: colors.moss },
          ]}
          onPress={handleToggleFollow}
          disabled={toggleStatus === "toggling"}
        >
          {toggleStatus === "toggling" ? (
            <ActivityIndicator color={following ? colors.inkSoft : colors.paper} />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                { fontFamily: fonts.bodySemiBold, color: following ? colors.inkSoft : colors.paper },
              ]}
            >
              {following ? "Unfollow" : "Follow"}
            </Text>
          )}
        </Pressable>
      ) : null}

      {toggleStatus === "error" ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{toggleError}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 34,
  },
  name: {
    fontSize: 20,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  followButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    minWidth: 140,
  },
  followButtonText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
  },
});
