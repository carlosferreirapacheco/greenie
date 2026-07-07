import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProfile, type Profile } from "../../lib/supabase/profiles";
import { colors, fontAssets, getFonts, radius, spacing } from "../../lib/theme";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(() => {
    if (!id) {
      return;
    }
    getProfile(id)
      .then((data) => {
        setProfile(data);
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
});
