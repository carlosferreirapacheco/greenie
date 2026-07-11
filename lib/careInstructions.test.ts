jest.mock("./supabase/client", () => {
  const { createMockSupabaseClient } = require("./supabase/testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { buildCareInstructionsText } from "./careInstructions";
import type { Plant } from "./supabase/plants";
import type { CareTask } from "./supabase/care_tasks";

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: "p1",
    owner_id: "u1",
    name: "Pothos",
    species: "Epipremnum aureum",
    photo_urls: null,
    location: "Living room",
    acquired_at: null,
    created_at: "2026-01-01",
    nickname: null,
    ...overrides,
  };
}

function makeTask(overrides: Partial<CareTask> = {}): CareTask {
  return {
    id: "t1",
    plant_id: "p1",
    type: "water",
    frequency_days: 7,
    last_done: null,
    next_due: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildCareInstructionsText", () => {
  it("formats a single plant with one task", () => {
    const text = buildCareInstructionsText([{ ...makePlant(), tasks: [makeTask()] }]);

    expect(text).toContain("Pothos");
    expect(text).toContain("Epipremnum aureum");
    expect(text).toContain("Location: Living room");
    expect(text).toContain("Water: every 7 days");
  });

  it("uses the nickname as the primary name and shows the common name alongside it", () => {
    const text = buildCareInstructionsText([{ ...makePlant({ nickname: "Big Fred" }), tasks: [] }]);

    expect(text).toContain("Big Fred (Pothos)");
  });

  it("lists every task for a plant with multiple tasks", () => {
    const text = buildCareInstructionsText([
      {
        ...makePlant(),
        tasks: [makeTask({ id: "t1", type: "water", frequency_days: 7 }), makeTask({ id: "t2", type: "fertilize", frequency_days: 30 })],
      },
    ]);

    expect(text).toContain("Water: every 7 days");
    expect(text).toContain("Fertilize: every 30 days");
  });

  it("notes when a plant has no scheduled tasks", () => {
    const text = buildCareInstructionsText([{ ...makePlant(), tasks: [] }]);

    expect(text).toContain("No care tasks scheduled.");
  });

  it("shows 'not scheduled' for a task with a null next_due", () => {
    const text = buildCareInstructionsText([{ ...makePlant(), tasks: [makeTask({ next_due: null })] }]);

    expect(text).toContain("next due not scheduled");
  });

  it("uses singular 'day' for a frequency of 1", () => {
    const text = buildCareInstructionsText([{ ...makePlant(), tasks: [makeTask({ frequency_days: 1 })] }]);

    expect(text).toContain("every 1 day,");
  });

  it("separates multiple plants and includes each one's info", () => {
    const text = buildCareInstructionsText([
      { ...makePlant({ id: "p1", name: "Pothos" }), tasks: [makeTask({ plant_id: "p1" })] },
      { ...makePlant({ id: "p2", name: "Snake plant", species: "Dracaena trifasciata", location: null }), tasks: [] },
    ]);

    expect(text).toContain("Pothos");
    expect(text).toContain("Snake plant");
    expect(text).toContain("Dracaena trifasciata");
    expect(text).not.toContain("Location: null");
  });
});
