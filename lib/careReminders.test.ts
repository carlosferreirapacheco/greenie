jest.mock("./supabase/client", () => {
  const { createMockSupabaseClient } = require("./supabase/testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { buildReminderContent, parseStoredCareRemindersFlag, selectSchedulableTasks } from "./careReminders";
import type { CareTask } from "./supabase/care_tasks";

function task(overrides: Partial<CareTask>): CareTask {
  return {
    id: "ct1",
    plant_id: "pl1",
    type: "water",
    frequency_days: 7,
    last_done: null,
    next_due: null,
    ...overrides,
  };
}

describe("selectSchedulableTasks", () => {
  const now = new Date("2026-07-16T12:00:00Z");

  it("keeps only tasks with a future next_due", () => {
    const tasks = [
      task({ id: "future", next_due: "2026-07-20T12:00:00Z" }),
      task({ id: "past", next_due: "2026-07-10T12:00:00Z" }),
      task({ id: "none", next_due: null }),
    ];

    const result = selectSchedulableTasks(tasks, now);

    expect(result.map((t) => t.id)).toEqual(["future"]);
  });

  it("excludes a task due exactly now (nothing left to schedule)", () => {
    const tasks = [task({ next_due: "2026-07-16T12:00:00Z" })];

    expect(selectSchedulableTasks(tasks, now)).toEqual([]);
  });
});

describe("parseStoredCareRemindersFlag", () => {
  it("defaults to on when the key was never set", () => {
    expect(parseStoredCareRemindersFlag(null)).toBe(true);
  });

  it("stays off once persisted off (e.g. after a permission denial)", () => {
    expect(parseStoredCareRemindersFlag("false")).toBe(false);
  });

  it("stays on when explicitly enabled", () => {
    expect(parseStoredCareRemindersFlag("true")).toBe(true);
  });
});

describe("buildReminderContent", () => {
  it("uses the task type verb and the plant's primary name", () => {
    const content = buildReminderContent(task({ type: "water" }), { name: "Pothos", nickname: null });

    expect(content.title).toBe("Time to water Pothos");
    expect(content.body.length).toBeGreaterThan(0);
  });

  it("prefers the nickname when set, matching display convention everywhere else", () => {
    const content = buildReminderContent(task({ type: "repot" }), { name: "Pothos", nickname: "Big Fred" });

    expect(content.title).toBe("Time to repot Big Fred");
  });
});
