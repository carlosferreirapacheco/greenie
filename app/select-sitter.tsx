import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getMutualFollowers } from "../lib/supabase/follows";
import { type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

function SitterRow({ profile, fonts }: { profile: Profile; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.line }]}
      onPress={() => router.push(`/request-sitting?userId=${profile.id}`)}
    >
      <PhotoThumb uri={profile.avatar_url} size={44} radius={radius.sm} />
      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
        {profile.display_name ?? `@${profile.username}`}
      </Text>
    </Pressable>
  );
}

export default function SelectSitterScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [mutualFollowers, setMutualFollowers] = useState<Profile[]>([]);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchMutualFollowers = useCallback(() => {
    getMutualFollowers()
      .then((data) => {
        setMutualFollowers(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMutualFollowers();
    }, [fetchMutualFollowers])
  );

  const screen = <Stack.Screen options={{ title: t("selectSitter.screenTitle") }} />;

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("selectSitter.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (mutualFollowers.length === 0) {
    return (
      <View style={[styles.center, styles.emptyPadding, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft, textAlign: "center" }}>
          {t("selectSitter.emptyState")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
      <FlatList
        style={styles.list}
        data={mutualFollowers}
        keyExtractor={(profile) => profile.id}
        renderItem={({ item }) => <SitterRow profile={item} fonts={fonts} />}
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
  emptyPadding: {
    paddingHorizontal: spacing.lg,
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
