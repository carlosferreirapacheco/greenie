import { plantPrimaryName, type Plant } from "./supabase/plants";
import type { CareTask } from "./supabase/care_tasks";

// Pure logic for local care-task reminders, kept free of
// expo-notifications/AsyncStorage imports so it's unit-testable --
// the native scheduling lives in careReminderScheduler.ts.

// Device-local (AsyncStorage) on purpose, like the theme preference:
// reminders are scheduled on this device, so the toggle belongs to it.
export const CARE_REMINDERS_STORAGE_KEY = "careRemindersEnabled";

// Only future due dates get a scheduled reminder -- overdue tasks are
// already surfaced by the in-app status pills, and expo-notifications
// would fire a past-dated trigger immediately, which would spam every
// app open while something stays overdue.
export function selectSchedulableTasks(tasks: CareTask[], now: Date): (CareTask & { next_due: string })[] {
  return tasks.filter(
    (task): task is CareTask & { next_due: string } =>
      task.next_due !== null && new Date(task.next_due).getTime() > now.getTime()
  );
}

export function buildReminderContent(task: CareTask, plant: Pick<Plant, "name" | "nickname">): {
  title: string;
  body: string;
} {
  return {
    title: `Time to ${task.type} ${plantPrimaryName(plant)}`,
    body: "Tap to open this plant and mark it done.",
  };
}
