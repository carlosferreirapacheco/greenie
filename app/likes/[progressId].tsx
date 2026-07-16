import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getLikersForProgress, type LikerProfile } from "../../lib/supabase/likes";
import { PhotoThumb } from "../../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { getErrorMessage } from "../../lib/errors";

function LikerRow({ liker, fonts }: { liker: LikerProfile; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  const name = liker.display_name ?? (liker.username ? `@${liker.username}` : "Someone");

  if (liker.username === null) {
    return (
      <View style={[styles.row, { borderBottomColor: colors.line }]}>
        <PhotoThumb uri={null} size={44} radius={radius.sm} />
        <Text style={[styles.name, { fontFamily: fonts.display, color: colors.inkSoft }]}>{name}</Text>
      </View>
    );
  }

  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.line }]} onPress={() => router.push(`/user/${liker.user_id}`)}>
      <PhotoThumb uri={liker.avatar_url} size={44} radius={radius.sm} />
      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>{name}</Text>
    </Pressable>
  );
}

// Who liked a report -- likes_select_visible RLS already scopes the rows
// getLikersForProgress returns to exactly the visibility the report has,
// so this screen just renders whatever it gets back.
export default function LikesScreen() {
  const { progressId } = useLocalSearchParams<{ progressId: string }>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  useFocusEffect(
    useCallback(() => {
      getLikersForProgress(progressId)
        .then((data) => {
          setLikers(data);
          setStatus("ready");
        })
        .catch((err) => {
          setError(getErrorMessage(err));
          setStatus("error");
        });
    }, [progressId])
  );

  const screen = <Stack.Screen options={{ title: "Liked by" }} />;

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

  if (likers.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>No likes yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
      <FlatList
        style={styles.list}
        data={likers}
        keyExtractor={(liker) => liker.user_id}
        renderItem={({ item }) => <LikerRow liker={item} fonts={fonts} />}
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
    flexShrink: 1,
  },
});
