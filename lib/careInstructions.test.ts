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
    archived_at: null,
    light_exposure: null,
    care_difficulty: null,
    toxic_to_pets: null,
    toxic_to_humans: null,
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

  it("includes light exposure and difficulty when set", () => {
    const text = buildCareInstructionsText([
      { ...makePlant({ light_exposure: "bright_indirect", care_difficulty: "beginner" }), tasks: [] },
    ]);

    expect(text).toContain("Light: Bright indirect light");
    expect(text).toContain("Difficulty: Beginner");
  });

  it("shows toxicity as toxic/safe based on the stored answer, omitting unknown", () => {
    const text = buildCareInstructionsText([
      { ...makePlant({ toxic_to_pets: "yes", toxic_to_humans: "no" }), tasks: [] },
    ]);

    expect(text).toContain("Toxic to pets");
    expect(text).toContain("Safe for humans");

    const unknownText = buildCareInstructionsText([
      { ...makePlant({ toxic_to_pets: "unknown", toxic_to_humans: null }), tasks: [] },
    ]);

    expect(unknownText).not.toContain("pets");
    expect(unknownText).not.toContain("humans");
  });

  it("omits light exposure/difficulty lines entirely when unset", () => {
    const text = buildCareInstructionsText([{ ...makePlant(), tasks: [] }]);

    expect(text).not.toContain("Light:");
    expect(text).not.toContain("Difficulty:");
  });
});
