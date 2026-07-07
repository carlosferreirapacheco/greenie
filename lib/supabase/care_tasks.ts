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
