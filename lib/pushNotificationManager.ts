import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { PUSH_ENABLED_STORAGE_KEY, notificationTargetPath, parseStoredFlag } from "./pushNotifications";
import { deletePushToken, upsertPushToken } from "./supabase/push_tokens";

// Thin expo-notifications wrapper around the pure logic in
// pushNotifications.ts. Everything here is native-only -- OS pushes
// don't exist on web (web users have the in-app inbox), so every
// entry point no-ops there and the Settings toggle is replaced by a
// hint on web.

export async function getPushEnabled(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    return parseStoredFlag(await AsyncStorage.getItem(PUSH_ENABLED_STORAGE_KEY));
  } catch {
    return true;
  }
}

// Refusing the OS permission turns the setting off for good (the
// default is ON, so just leaving the key unset would flip it back).
async function persistPushOff(): Promise<void> {
  try {
    await AsyncStorage.setItem(PUSH_ENABLED_STORAGE_KEY, "false");
  } catch {
    // Worst case the permission check runs again next time.
  }
}

// This device's Expo push token. Null when it can't be issued -- most
// notably while the owner-side FCM setup (docs/push-notifications.md)
// hasn't been done yet -- so every caller treats push as best-effort.
async function getDeviceToken(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return null;
    }
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return result.data;
  } catch {
    return null;
  }
}

// Returns whether push ended up enabled: turning it on first asks for
// notification permission, and a denial leaves it off.
export async function setPushEnabled(enabled: boolean): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  if (enabled) {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      await persistPushOff();
      return false;
    }
  }

  await AsyncStorage.setItem(PUSH_ENABLED_STORAGE_KEY, String(enabled));

  if (enabled) {
    await registerForPush();
  } else {
    // Removing the token row is what actually stops deliveries --
    // notifications keep being created and stay visible in the
    // in-app inbox, they just no longer reach this device.
    const token = await getDeviceToken();
    if (token) {
      await deletePushToken(token);
    }
  }
  return enabled;
}

// Register this device for the signed-in user. Called on app start
// with a session and after enabling the Settings toggle. Push is on
// by default, so the first run on a fresh install is where the
// permission prompt happens; a refusal turns the setting off
// (persisted) instead of re-prompting every launch.
export async function registerForPush(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  if (!(await getPushEnabled())) {
    return;
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    await persistPushOff();
    return;
  }

  const token = await getDeviceToken();
  if (!token) {
    return;
  }
  try {
    await upsertPushToken(token, Platform.OS);
  } catch {
    // Non-critical -- registration retries on the next app start.
  }
}

// Best-effort cleanup on sign-out, so a signed-out device stops
// receiving the old account's pushes. Must run while the session is
// still valid (RLS-scoped delete). The enabled flag is left alone --
// the next sign-in on this device re-registers.
export async function unregisterPushForSignOut(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    const token = await getDeviceToken();
    if (token) {
      await deletePushToken(token);
    }
  } catch {
    // Non-critical -- the stale token is also cleaned up server-side
    // the first time Expo reports it as DeviceNotRegistered.
  }
}

// One-time setup from the root layout: how a push presents while the
// app is foregrounded, plus the Android notification channel
// (required on Android 8+ for anything to show at all).
export function configurePushHandling(): void {
  if (Platform.OS === "web") {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "Notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {
      // Non-critical -- delivery still works against the default
      // channel behavior if this fails.
    });
  }
}

// Tapping a notification deep-links by kind via the shared
// notificationTargetPath. Returns the subscription so the caller's
// effect can clean it up.
export function addPushResponseListener(
  onNavigate: (path: string) => void
): { remove: () => void } | null {
  if (Platform.OS === "web") {
    return null;
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    const asString = (value: unknown) => (typeof value === "string" ? value : null);

    if (typeof data.type === "string") {
      const path = notificationTargetPath(data.type, {
        progressId: asString(data.progressId),
        actorId: asString(data.actorId),
        plantId: asString(data.plantId),
      });
      if (path) {
        onNavigate(path);
      }
    } else if (typeof data.plantId === "string") {
      // Transition path: locally scheduled care reminders from before
      // this feature carry only { plantId }; any still pending on a
      // device should keep landing on their plant.
      onNavigate(`/plant/${data.plantId}`);
    }
  });
}
