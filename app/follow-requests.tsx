import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Stack, useFocusEffect } from "expo-router";
import { acceptFollowRequest, declineFollowRequest, getPendingFollowRequests } from "../lib/supabase/follows";
import { type Profile } from "../lib/supabase/profiles";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

function RequestRow({
  profile,
  fonts,
  busy,
  onAccept,
  onDecline,
}: {
  profile: Profile;
  fonts: ReturnType<typeof getFonts>;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <PhotoThumb uri={profile.avatar_url} size={44} radius={radius.sm} />
      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
        {profile.display_name ?? `@${profile.username}`}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={onAccept} disabled={busy} hitSlop={8}>
          {busy ? (
            <ActivityIndicator color={colors.moss} />
          ) : (
            <Text style={[styles.acceptLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
              {t("common.accept")}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={onDecline} disabled={busy} hitSlop={8}>
          <Text style={[styles.declineLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
            {t("common.decline")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FollowRequestsScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<Profile[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchRequests = useCallback(() => {
    getPendingFollowRequests()
      .then((data) => {
        setRequests(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  async function handleAccept(followerId: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = followerId;
    setBusyId(followerId);
    setActionError(null);

    try {
      await acceptFollowRequest(followerId);
      setRequests((prev) => prev.filter((profile) => profile.id !== followerId));
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }

  async function handleDecline(followerId: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = followerId;
    setBusyId(followerId);
    setActionError(null);

    try {
      await declineFollowRequest(followerId);
      setRequests((prev) => prev.filter((profile) => profile.id !== followerId));
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }

  const screen = <Stack.Screen options={{ title: t("followRequests.screenTitle") }} />;

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("followRequests.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("followRequests.emptyState")}</Text>
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
        data={requests}
        keyExtractor={(profile) => profile.id}
        renderItem={({ item }) => (
          <RequestRow
            profile={item}
            fonts={fonts}
            busy={busyId === item.id}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
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
  name: {
    fontSize: 16,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  acceptLink: {
    fontSize: 14,
  },
  declineLink: {
    fontSize: 14,
  },
});
