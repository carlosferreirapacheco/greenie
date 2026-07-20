import { useCallback, useEffect, useState } from "react";
import { Pressable } from "react-native";
import { router, Tabs, useNavigation } from "expo-router";
import { useFonts } from "expo-font";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { getMyProfile } from "../../lib/supabase/profiles";
import { getUnreadNotificationCount } from "../../lib/supabase/notifications";
import { getPendingFollowRequests } from "../../lib/supabase/follows";
import { PhotoThumb } from "../../components/PhotoThumb";
import { HeaderIconButton } from "../../components/HeaderIconButton";
import { fontAssets, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";

// The persistent bottom tab bar over the four main destinations
// (Plants, Feed, Sitting, Alerts). Every other screen stays in the
// root Stack and pushes over it. Route groups don't appear in URLs,
// so /feed, /plant-sitting, /notifications and / all keep working --
// including the push/inbox deep links via notificationTargetPath.
export default function TabsLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation();

  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  const refetchHeaderState = useCallback(() => {
    getMyProfile()
      .then((profile) => setMyAvatarUrl(profile.avatar_url))
      .catch(() => {
        // Non-critical -- the header keeps the placeholder if this fails.
      });
    getUnreadNotificationCount()
      .then((count) => setHasUnreadNotifications(count > 0))
      .catch(() => {
        // Non-critical -- the badge just won't show if this fails.
      });
    getPendingFollowRequests()
      .then((requests) => setHasPendingRequests(requests.length > 0))
      .catch(() => {
        // Non-critical -- the badge just won't show if this fails.
      });
  }, []);

  // Refetch on every navigation-state change. From this layout,
  // useNavigation() is the ROOT stack's navigation, whose state tree
  // includes the nested tab state -- so this fires on tab switches AND
  // on push/pop of stack screens (returning from /profile or
  // /notifications' deep-link targets), keeping the avatar and both
  // badge dots as fresh as the old per-screen focus refetch did.
  // (useSegments() was tried first and does not re-render this layout
  // on tab changes.)
  useEffect(() => {
    refetchHeaderState();
    const unsubscribe = navigation.addListener("state", refetchHeaderState);
    return unsubscribe;
  }, [navigation, refetchHeaderState]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
        headerTintColor: colors.moss,
        headerTitleAlign: "center",
        headerLeftContainerStyle: { paddingLeft: spacing.md },
        headerRightContainerStyle: { paddingRight: spacing.md },
        headerLeft: () => (
          <Pressable onPress={() => router.push("/profile")} hitSlop={8}>
            <PhotoThumb uri={myAvatarUrl} size={28} radius={radius.sm} />
          </Pressable>
        ),
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.moss,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabsLayout.plants.title"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sprout" size={size} color={color} />,
          headerRight: () => (
            <HeaderIconButton
              icon="plus"
              label={t("tabsLayout.plants.addAction")}
              onPress={() => router.push("/add-plant")}
              fonts={fonts}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t("tabsLayout.feed.title"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="newspaper-variant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="following"
        options={{
          title: t("tabsLayout.people.title"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
          ),
          tabBarBadge: hasPendingRequests ? "" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.coral,
            minWidth: 10,
            maxWidth: 10,
            height: 10,
            borderRadius: 5,
            marginTop: 2,
          },
          // headerRight (Requests/Followers/Search) is set by the screen
          // itself via navigation.setOptions -- Requests carries its own
          // pending-request badge dot, same pattern as plant-sitting.tsx.
        }}
      />
      <Tabs.Screen
        name="plant-sitting"
        options={{
          title: t("tabsLayout.plantSitting.title"),
          tabBarLabel: t("tabsLayout.plantSitting.tabLabel"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="hand-heart-outline" size={size} color={color} />
          ),
          // headerRight (Request + Share) is set by the screen itself
          // via navigation.setOptions -- the Share action carries busy
          // state that lives there.
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("tabsLayout.notifications.title"),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bell-outline" size={size} color={color} />,
          tabBarBadge: hasUnreadNotifications ? "" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.coral,
            minWidth: 10,
            maxWidth: 10,
            height: 10,
            borderRadius: 5,
            marginTop: 2,
          },
        }}
      />
    </Tabs>
  );
}
