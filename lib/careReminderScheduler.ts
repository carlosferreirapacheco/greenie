import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  CARE_REMINDERS_STORAGE_KEY,
  buildReminderContent,
  parseStoredCareRemindersFlag,
  selectSchedulableTasks,
} from "./careReminders";
import type { Plant } from "./supabase/plants";
import type { CareTask } from "./supabase/care_tasks";

// Thin expo-notifications wrapper around the pure logic in
// careReminders.ts. Everything here is native-only -- local scheduled
// notifications don't exist on web, so every entry point no-ops there
// and the Settings toggle is replaced by a hint on web.

export async function getCareRemindersEnabled(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    return parseStoredCareRemindersFlag(await AsyncStorage.getItem(CARE_REMINDERS_STORAGE_KEY));
  } catch {
    return true;
  }
}

// Refusing the OS permission turns the setting off for good (the
// default is ON, so just leaving the key unset would flip it back).
async function persistCareRemindersOff(): Promise<void> {
  try {
    await AsyncStorage.setItem(CARE_REMINDERS_STORAGE_KEY, "false");
  } catch {
    // Worst case the permission check runs again next time.
  }
}

// Returns whether reminders ended up enabled: turning them on first
// asks for notification permission, and a denial leaves them off.
export async function setCareRemindersEnabled(enabled: boolean): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  if (enabled) {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      await persistCareRemindersOff();
      return false;
    }
  }

  await AsyncStorage.setItem(CARE_REMINDERS_STORAGE_KEY, String(enabled));
  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  return enabled;
}

// Cancel-all-then-reschedule from the current task list, one
// notification per task with a future next_due. Called fire-and-forget
// whenever the Plants screen (which already fetches plants + tasks on
// focus) has fresh data, so reminders track task edits without their
// own fetch.
export async function rescheduleCareReminders(plants: Plant[], tasks: CareTask[]): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  if (!(await getCareRemindersEnabled())) {
    return;
  }

  // Reminders are on by default, so the first reschedule on a fresh
  // install is where the permission prompt happens. A refusal turns
  // the setting off (persisted) instead of re-prompting every focus.
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    await persistCareRemindersOff();
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  const plantsById = new Map(plants.map((plant) => [plant.id, plant]));
  for (const task of selectSchedulableTasks(tasks, new Date())) {
    const plant = plantsById.get(task.plant_id);
    if (!plant) {
      continue;
    }
    await Notifications.scheduleNotificationAsync({
      content: { ...buildReminderContent(task, plant), data: { plantId: task.plant_id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(task.next_due) },
    });
  }
}

// One-time setup from the root layout: how a reminder presents while
// the app is foregrounded, plus the Android notification channel
// (required on Android 8+ for anything to show at all).
export function configureCareReminderHandling(): void {
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
      name: "Care reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {
      // Non-critical -- scheduling still works against the default
      // channel behavior if this fails.
    });
  }
}

// Tapping a reminder deep-links to its plant. Returns the subscription
// so the caller's effect can clean it up.
export function addCareReminderResponseListener(
  onOpenPlant: (plantId: string) => void
): { remove: () => void } | null {
  if (Platform.OS === "web") {
    return null;
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    const plantId = response.notification.request.content.data?.plantId;
    if (typeof plantId === "string") {
      onOpenPlant(plantId);
    }
  });
}
