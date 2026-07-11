import type { Plant } from "./supabase/plants";
import type { CareTask, CareTaskType } from "./supabase/care_tasks";
import { plantPrimaryName, plantCommonNameSubtitle } from "./supabase/plants";

const TASK_LABELS: Record<CareTaskType, string> = {
  water: "Water",
  fertilize: "Fertilize",
  repot: "Repot",
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return "not scheduled";
  }
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Plain-text, email-friendly care summary for every plant passed in --
// meant to be handed to the device's native share sheet for a non-app
// friend/sitter, not rendered in-app.
export function buildCareInstructionsText(plants: (Plant & { tasks: CareTask[] })[]): string {
  const lines: string[] = ["Plant care instructions", ""];

  for (const plant of plants) {
    lines.push(`${plantPrimaryName(plant)}${plantCommonNameSubtitle(plant) ? ` (${plantCommonNameSubtitle(plant)})` : ""}`);
    if (plant.species) {
      lines.push(plant.species);
    }
    if (plant.location) {
      lines.push(`Location: ${plant.location}`);
    }

    if (plant.tasks.length === 0) {
      lines.push("No care tasks scheduled.");
    } else {
      for (const task of plant.tasks) {
        lines.push(`- ${TASK_LABELS[task.type]}: every ${task.frequency_days} day${task.frequency_days === 1 ? "" : "s"}, next due ${formatDate(task.next_due)}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
