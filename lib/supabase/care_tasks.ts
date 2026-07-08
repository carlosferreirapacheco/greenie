import { supabase } from "./client";

export type CareTaskType = "water" | "fertilize" | "repot";

export type CareTask = {
  id: string;
  plant_id: string;
  type: CareTaskType;
  frequency_days: number;
  last_done: string | null;
  next_due: string | null;
};

export async function getCareTasksForPlants(plantIds: string[]): Promise<CareTask[]> {
  if (plantIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("care_tasks")
    .select("*")
    .in("plant_id", plantIds);

  if (error) {
    throw error;
  }

  return data;
}

export async function createCareTask(input: {
  plant_id: string;
  type: CareTaskType;
  frequency_days: number;
  next_due: string;
}): Promise<CareTask> {
  const { data, error } = await supabase
    .from("care_tasks")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCareTaskFrequency(id: string, frequency_days: number): Promise<CareTask> {
  const { data, error } = await supabase
    .from("care_tasks")
    .update({ frequency_days })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCareTask(id: string): Promise<void> {
  const { error } = await supabase.from("care_tasks").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

// nextDueAnchor is the point in time frequency_days is added to, to get
// the new next_due. Defaults to now (the common case: marking a task
// done on or before its due date). For a task marked done after its due
// date, the caller may instead pass the task's original next_due as the
// anchor, keeping the schedule on its original cadence rather than
// restarting it from today.
export async function markCareTaskDone(task: CareTask, nextDueAnchor: Date = new Date()): Promise<CareTask> {
  const now = new Date();
  const nextDue = new Date(nextDueAnchor.getTime() + task.frequency_days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("care_tasks")
    .update({ last_done: now.toISOString(), next_due: nextDue.toISOString() })
    .eq("id", task.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type PlantCareStatus = "healthy" | "due_soon" | "overdue";

const DUE_SOON_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export function getPlantCareStatus(nextDue: string): PlantCareStatus {
  const dueAt = new Date(nextDue).getTime();
  const now = Date.now();

  if (dueAt < now) {
    return "overdue";
  }

  if (dueAt - now <= DUE_SOON_WINDOW_MS) {
    return "due_soon";
  }

  return "healthy";
}

export type PlantCareSummary = {
  primary: { type: CareTaskType; status: PlantCareStatus } | null;
  watering: { status: PlantCareStatus } | null;
};

export function summarizeCareTasks(tasks: CareTask[]): PlantCareSummary {
  const scheduled = tasks.filter((task): task is CareTask & { next_due: string } => task.next_due !== null);

  if (scheduled.length === 0) {
    return { primary: null, watering: null };
  }

  const earliest = scheduled.reduce((soonest, task) =>
    new Date(task.next_due).getTime() < new Date(soonest.next_due).getTime() ? task : soonest
  );

  const primary = { type: earliest.type, status: getPlantCareStatus(earliest.next_due) };

  if (earliest.type === "water") {
    return { primary, watering: null };
  }

  const waterTask = scheduled.find((task) => task.type === "water");
  const watering = waterTask ? { status: getPlantCareStatus(waterTask.next_due) } : null;

  return { primary, watering };
}
