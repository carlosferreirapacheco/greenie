import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  getNotifications,
  markAllNotificationsRead,
  type NotificationWithActor,
} from "../lib/supabase/notifications";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

// Actor can be unresolvable (block asymmetry hides their profile) --
// fall back to a neutral name rather than an empty sentence.
function actorName(notification: NotificationWithActor): string {
  if (notification.actor_display_name) {
    return notification.actor_display_name;
  }
  return notification.actor_username ? `@${notification.actor_username}` : "Someone";
}

function notificationSentence(notification: NotificationWithActor): string {
  const name = actorName(notification);
  switch (notification.type) {
    case "comment":
      return `${name} commented on your report`;
    case "like":
      return `${name} liked your report`;
    case "follow_request":
      return `${name} requested to follow you`;
    case "new_follower":
      return `${name} started following you`;
    case "follow_accepted":
      return `${name} accepted your follow request`;
    case "sitting_request":
      return `${name} asked you to plant-sit`;
    case "sitting_accepted":
      return `${name} accepted your plant-sitting request`;
    case "sitting_declined":
      return `${name} declined your plant-sitting request`;
  }
}

function notificationTarget(notification: NotificationWithActor): string | null {
  switch (notification.type) {
    case "comment":
    case "like":
      return notification.progress_id ? `/progress/${notification.progress_id}` : null;
    case "follow_request":
      return "/follow-requests";
    case "new_follower":
    case "follow_accepted":
      return `/user/${notification.actor_id}`;
    case "sitting_request":
    case "sitting_accepted":
    case "sitting_declined":
      return "/plant-sitting";
  }
}

function NotificationRow({
  notification,
  fonts,
}: {
  notification: NotificationWithActor;
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
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
          {notificationSentence(notification)}
        </Text>
        <Text style={[styles.timestamp, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {dateFormatter.format(new Date(notification.created_at))}
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

  const screen = <Stack.Screen options={{ title: "Notifications" }} />;

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

  if (notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>Nothing here yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
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
