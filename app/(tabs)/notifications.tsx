import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, useFocusEffect } from "expo-router";
import {
  getNotifications,
  markAllNotificationsRead,
  type NotificationWithActor,
} from "../../lib/supabase/notifications";
import { notificationTargetPath } from "../../lib/pushNotifications";
import { PhotoThumb } from "../../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { getErrorMessage } from "../../lib/errors";
import { formatDisplayDate } from "../../lib/dateFormat";

// Actor can be unresolvable (block asymmetry hides their profile) --
// fall back to a neutral name rather than an empty sentence.
function actorName(notification: NotificationWithActor, t: (key: string) => string): string {
  if (notification.actor_display_name) {
    return notification.actor_display_name;
  }
  return notification.actor_username ? `@${notification.actor_username}` : t("likes.fallbackName");
}

function notificationSentence(notification: NotificationWithActor, t: (key: string, params?: Record<string, string>) => string): string {
  if (notification.type === "care_due") {
    const plantName = notification.plant_name ?? t("notificationsScreen.plantFallback");
    switch (notification.care_task_type) {
      case "fertilize":
        return t("notificationsScreen.sentence.careDueFertilize", { plant: plantName });
      case "repot":
        return t("notificationsScreen.sentence.careDueRepot", { plant: plantName });
      case "water":
      default:
        return t("notificationsScreen.sentence.careDueWater", { plant: plantName });
    }
  }

  const name = actorName(notification, t);
  switch (notification.type) {
    case "comment":
      return t("notificationsScreen.sentence.comment", { name });
    case "like":
      return t("notificationsScreen.sentence.like", { name });
    case "follow_request":
      return t("notificationsScreen.sentence.followRequest", { name });
    case "new_follower":
      return t("notificationsScreen.sentence.newFollower", { name });
    case "follow_accepted":
      return t("notificationsScreen.sentence.followAccepted", { name });
    case "sitting_request":
      return t("notificationsScreen.sentence.sittingRequest", { name });
    case "sitting_accepted":
      return t("notificationsScreen.sentence.sittingAccepted", { name });
    case "sitting_declined":
      return t("notificationsScreen.sentence.sittingDeclined", { name });
  }
}

// Deep-linking lives in the shared notificationTargetPath so inbox
// taps and push taps always land on the same screen per kind.
function notificationTarget(notification: NotificationWithActor): string | null {
  return notificationTargetPath(notification.type, {
    progressId: notification.progress_id,
    actorId: notification.actor_id,
    plantId: notification.plant_id,
  });
}

function NotificationRow({
  notification,
  fonts,
}: {
  notification: NotificationWithActor;
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const target = notificationTarget(notification);
  const isUnread = notification.read_at === null;

  return (
    <Pressable
      style={[
        styles.row,
        { borderBottomColor: colors.line },
        isUnread && { backgroundColor: colors.sage },
      ]}
      onPress={() => {
        if (target) {
          router.push(target);
        }
      }}
    >
      <PhotoThumb uri={notification.actor_avatar_url} size={44} radius={radius.sm} />
      <View style={styles.rowText}>
        <Text style={[styles.sentence, { fontFamily: isUnread ? fonts.bodyMedium : fonts.body, color: colors.ink }]}>
          {notificationSentence(notification, t)}
        </Text>
        <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {formatDisplayDate(notification.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchNotifications = useCallback(() => {
    getNotifications()
      .then((data) => {
        setNotifications(data);
        setStatus("ready");
        // The fetched snapshot keeps its unread highlights for this
        // visit; marking read here means they're gone next time.
        if (data.some((notification) => notification.read_at === null)) {
          markAllNotificationsRead().catch(() => {
            // Non-critical -- rows just stay unread until the next visit.
          });
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("notificationsScreen.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("notificationsScreen.emptyState")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      <FlatList
        style={styles.list}
        data={notifications}
        keyExtractor={(notification) => notification.id}
        renderItem={({ item }) => <NotificationRow notification={item} fonts={fonts} />}
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
  rowText: {
    flex: 1,
    gap: 2,
  },
  sentence: {
    fontSize: 14.5,
  },
  timestamp: {
    fontSize: 12,
  },
});
