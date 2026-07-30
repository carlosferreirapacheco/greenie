import { getPlantCareStatus, summarizeCareTasks, type CareTask } from "./care_tasks";

const NOW = "2026-01-15T12:00:00.000Z";

function task(overrides: Partial<CareTask>): CareTask {
  return {
    id: "task-1",
    plant_id: "plant-1",
    type: "water",
    frequency_days: 7,
    last_done: null,
    next_due: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(NOW));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("getPlantCareStatus", () => {
  it("is overdue when next_due falls on a past calendar day", () => {
    expect(getPlantCareStatus("2026-01-14T12:00:00.000Z")).toBe("overdue");
  });

  it("is due_today when next_due is later today, even though the clock has already passed that time", () => {
    // The bug this guards against: a task due today at 18:00 shouldn't
    // read "overdue" at noon today just because 18:00 hasn't arrived yet
    // -- nor should it read "overdue" once the clock passes 18:00, since
    // it's still today's calendar day.
    expect(getPlantCareStatus("2026-01-15T18:00:00.000Z")).toBe("due_today");
  });

  it("is due_today when next_due is earlier today, in the past relative to now", () => {
    expect(getPlantCareStatus("2026-01-15T00:00:00.000Z")).toBe("due_today");
  });

  it("is due_today when next_due is exactly now", () => {
    expect(getPlantCareStatus("2026-01-15T12:00:00.000Z")).toBe("due_today");
  });

  it("is due_soon when next_due is within the 2-day window", () => {
    expect(getPlantCareStatus("2026-01-16T12:00:00.000Z")).toBe("due_soon");
  });

  it("is due_soon at exactly the 2-day boundary", () => {
    expect(getPlantCareStatus("2026-01-17T12:00:00.000Z")).toBe("due_soon");
  });

  it("is healthy when next_due is beyond the 2-day window", () => {
    expect(getPlantCareStatus("2026-01-20T12:00:00.000Z")).toBe("healthy");
  });
});

describe("summarizeCareTasks", () => {
  it("returns nulls for an empty task list", () => {
    expect(summarizeCareTasks([])).toEqual({ primary: null, watering: null });
  });

  it("returns nulls when no task has a next_due yet", () => {
    const tasks = [task({ type: "water", next_due: null })];
    expect(summarizeCareTasks(tasks)).toEqual({ primary: null, watering: null });
  });

  it("uses the single water task as primary and leaves watering null", () => {
    const tasks = [task({ type: "water", next_due: "2026-01-20T12:00:00.000Z" })];
    expect(summarizeCareTasks(tasks)).toEqual({
      primary: { type: "water", status: "healthy" },
      watering: null,
    });
  });

  it("uses a scheduled non-water task as primary when there's no water task", () => {
    const tasks = [task({ type: "fertilize", next_due: "2026-01-20T12:00:00.000Z" })];
    expect(summarizeCareTasks(tasks)).toEqual({
      primary: { type: "fertilize", status: "healthy" },
      watering: null,
    });
  });

  it("surfaces watering separately when the primary task is non-water", () => {
    const tasks = [
      task({ id: "t-fert", type: "fertilize", next_due: "2026-01-16T12:00:00.000Z" }),
      task({ id: "t-water", type: "water", next_due: "2026-01-20T12:00:00.000Z" }),
    ];
    expect(summarizeCareTasks(tasks)).toEqual({
      primary: { type: "fertilize", status: "due_soon" },
      watering: { status: "healthy" },
    });
  });

  it("picks the earliest-due task as primary among several scheduled tasks", () => {
    const tasks = [
      task({ id: "t-repot", type: "repot", next_due: "2026-06-01T12:00:00.000Z" }),
      task({ id: "t-fert", type: "fertilize", next_due: "2026-01-14T12:00:00.000Z" }),
      task({ id: "t-water", type: "water", next_due: "2026-01-20T12:00:00.000Z" }),
    ];
    const summary = summarizeCareTasks(tasks);
    expect(summary.primary).toEqual({ type: "fertilize", status: "overdue" });
    expect(summary.watering).toEqual({ status: "healthy" });
  });

  it("ignores tasks with no next_due when picking the earliest", () => {
    const tasks = [
      task({ id: "t-unscheduled", type: "repot", next_due: null }),
      task({ id: "t-water", type: "water", next_due: "2026-01-20T12:00:00.000Z" }),
    ];
    expect(summarizeCareTasks(tasks).primary).toEqual({ type: "water", status: "healthy" });
  });
});

jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { getCareTasksForPlants, createCareTask, updateCareTaskFrequency, deleteCareTask, markCareTaskDone } from "./care_tasks";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getCareTasksForPlants", () => {
  it("returns an empty array without querying when given no plant ids", async () => {
    const result = await getCareTasksForPlants([]);
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("queries tasks for the given plant ids", async () => {
    const chain = createChainableQueryMock({ data: [task({})], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getCareTasksForPlants(["plant-1", "plant-2"]);

    expect(mockSupabase.from).toHaveBeenCalledWith("care_tasks");
    expect(chain.in).toHaveBeenCalledWith("plant_id", ["plant-1", "plant-2"]);
    expect(result).toEqual([task({})]);
  });
});

describe("createCareTask", () => {
  it("inserts the given task fields", async () => {
    const chain = createChainableQueryMock({ data: task({}), error: null });
    mockSupabase.from.mockReturnValue(chain);

    await createCareTask({ plant_id: "plant-1", type: "water", frequency_days: 7, next_due: "2026-01-20T00:00:00.000Z" });

    expect(chain.insert).toHaveBeenCalledWith({
      plant_id: "plant-1",
      type: "water",
      frequency_days: 7,
      next_due: "2026-01-20T00:00:00.000Z",
    });
  });
});

describe("updateCareTaskFrequency", () => {
  it("updates only frequency_days", async () => {
    const chain = createChainableQueryMock({ data: task({ frequency_days: 14 }), error: null });
    mockSupabase.from.mockReturnValue(chain);

    await updateCareTaskFrequency("task-1", 14);

    expect(chain.update).toHaveBeenCalledWith({ frequency_days: 14 });
    expect(chain.eq).toHaveBeenCalledWith("id", "task-1");
  });
});

describe("deleteCareTask", () => {
  it("deletes by id", async () => {
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await deleteCareTask("task-1");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "task-1");
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "delete failed" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(deleteCareTask("task-1")).rejects.toBe(err);
  });
});

describe("markCareTaskDone", () => {
  // Delegates to the record_care_completion() RPC (see the streaks
  // migration) instead of a plain UPDATE -- these assert the call shape
  // (params + device timezone), not the streak logic itself, which lives
  // in the database and is verified there.
  it("defaults the next_due anchor to now and passes the device's timezone", async () => {
    const chain = createChainableQueryMock({ data: task({}), error: null });
    mockSupabase.rpc.mockReturnValue(chain);
    const target = task({ id: "task-1", frequency_days: 7 });
    const expectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await markCareTaskDone(target);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("record_care_completion", {
      p_task_id: "task-1",
      p_next_due_anchor: "2026-01-15T12:00:00.000Z",
      p_client_timezone: expectedTimeZone,
    });
  });

  it("passes an explicit anchor (the overdue task's original due date) instead of now", async () => {
    const chain = createChainableQueryMock({ data: task({}), error: null });
    mockSupabase.rpc.mockReturnValue(chain);
    const target = task({ id: "task-1", frequency_days: 7 });
    const originalDueDate = new Date("2026-01-05T12:00:00.000Z");

    await markCareTaskDone(target, originalDueDate);

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "record_care_completion",
      expect.objectContaining({ p_task_id: "task-1", p_next_due_anchor: "2026-01-05T12:00:00.000Z" })
    );
  });

  it("returns the updated task from the RPC result", async () => {
    const updated = task({ id: "task-1", last_done: "2026-01-15T12:00:00.000Z" });
    mockSupabase.rpc.mockReturnValue(createChainableQueryMock({ data: updated, error: null }));

    await expect(markCareTaskDone(task({ id: "task-1" }))).resolves.toEqual(updated);
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "not authorized" };
    mockSupabase.rpc.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(markCareTaskDone(task({}))).rejects.toBe(err);
  });
});
