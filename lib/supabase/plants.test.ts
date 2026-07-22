import { plantPrimaryName, plantCommonNameSubtitle } from "./plants";

describe("plantPrimaryName", () => {
  it("returns the nickname when one is set", () => {
    expect(plantPrimaryName({ name: "Pothos", nickname: "Big Fred" })).toBe("Big Fred");
  });

  it("falls back to the common name when nickname is null", () => {
    expect(plantPrimaryName({ name: "Pothos", nickname: null })).toBe("Pothos");
  });

  it("falls back to the common name when nickname is whitespace-only", () => {
    expect(plantPrimaryName({ name: "Pothos", nickname: "   " })).toBe("Pothos");
  });
});

describe("plantCommonNameSubtitle", () => {
  it("returns the common name when a nickname is set", () => {
    expect(plantCommonNameSubtitle({ name: "Pothos", nickname: "Big Fred" })).toBe("Pothos");
  });

  it("returns null when there's no nickname, so it isn't shown twice", () => {
    expect(plantCommonNameSubtitle({ name: "Pothos", nickname: null })).toBeNull();
  });

  it("returns null when nickname is whitespace-only", () => {
    expect(plantCommonNameSubtitle({ name: "Pothos", nickname: "   " })).toBeNull();
  });
});

jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import {
  archivePlant,
  deletePlant,
  getArchivedPlants,
  getMyPlants,
  getPlantsForUser,
  getPlant,
  restorePlant,
  updatePlantAcquiredAt,
  updatePlantNickname,
  updatePlantPhoto,
  createPlant,
} from "./plants";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getMyPlants", () => {
  it("throws Not signed in without querying when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getMyPlants()).rejects.toThrow("Not signed in");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("queries the signed-in user's own plants, newest first", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: [{ id: "p1" }], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getMyPlants();

    expect(mockSupabase.from).toHaveBeenCalledWith("plants");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("owner_id", "u1");
    expect(chain.is).toHaveBeenCalledWith("archived_at", null);
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([{ id: "p1" }]);
  });

  it("throws the Supabase error on failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const err = { message: "db error" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(getMyPlants()).rejects.toBe(err);
  });
});

describe("getPlantsForUser", () => {
  it("queries plants for the given owner id without requiring a session", async () => {
    const chain = createChainableQueryMock({ data: [{ id: "p1" }], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getPlantsForUser("someone-elses-id");

    expect(mockSupabase.from).toHaveBeenCalledWith("plants");
    expect(chain.eq).toHaveBeenCalledWith("owner_id", "someone-elses-id");
    expect(chain.is).toHaveBeenCalledWith("archived_at", null);
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: "p1" }]);
  });
});

describe("getArchivedPlants", () => {
  it("throws Not signed in without querying when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getArchivedPlants()).rejects.toThrow("Not signed in");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("queries only archived plants for the signed-in user, most recently archived first", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: [{ id: "p1" }], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getArchivedPlants();

    expect(mockSupabase.from).toHaveBeenCalledWith("plants");
    expect(chain.eq).toHaveBeenCalledWith("owner_id", "u1");
    expect(chain.not).toHaveBeenCalledWith("archived_at", "is", null);
    expect(chain.order).toHaveBeenCalledWith("archived_at", { ascending: false });
    expect(result).toEqual([{ id: "p1" }]);
  });
});

describe("archivePlant", () => {
  it("sets archived_at to a timestamp and returns the updated row", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1", archived_at: "2026-01-01T00:00:00.000Z" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await archivePlant("p1");

    expect(chain.update).toHaveBeenCalledWith({ archived_at: expect.any(String) });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(result).toEqual({ id: "p1", archived_at: "2026-01-01T00:00:00.000Z" });
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "db error" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(archivePlant("p1")).rejects.toBe(err);
  });
});

describe("restorePlant", () => {
  it("clears archived_at back to null", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1", archived_at: null }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await restorePlant("p1");

    expect(chain.update).toHaveBeenCalledWith({ archived_at: null });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(result).toEqual({ id: "p1", archived_at: null });
  });
});

describe("deletePlant", () => {
  it("deletes the plant by id", async () => {
    const chain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await deletePlant("p1");

    expect(mockSupabase.from).toHaveBeenCalledWith("plants");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "db error" };
    mockSupabase.from.mockReturnValue(createChainableQueryMock({ data: null, error: err }));

    await expect(deletePlant("p1")).rejects.toBe(err);
  });
});

describe("getPlant", () => {
  it("fetches a single plant by id", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1", name: "Pothos" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await getPlant("p1");

    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(chain.single).toHaveBeenCalled();
    expect(result).toEqual({ id: "p1", name: "Pothos" });
  });
});

describe("updatePlantAcquiredAt", () => {
  it("updates acquired_at and returns the updated row", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1", acquired_at: "2026-01-01" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await updatePlantAcquiredAt("p1", "2026-01-01");

    expect(chain.update).toHaveBeenCalledWith({ acquired_at: "2026-01-01" });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(result).toEqual({ id: "p1", acquired_at: "2026-01-01" });
  });

  it("supports clearing the date back to null", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1", acquired_at: null }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await updatePlantAcquiredAt("p1", null);

    expect(chain.update).toHaveBeenCalledWith({ acquired_at: null });
  });
});

describe("updatePlantNickname", () => {
  it("updates the nickname and returns the updated row", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1", nickname: "Big Fred" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await updatePlantNickname("p1", "Big Fred");

    expect(chain.update).toHaveBeenCalledWith({ nickname: "Big Fred" });
    expect(result).toEqual({ id: "p1", nickname: "Big Fred" });
  });
});

describe("createPlant", () => {
  it("throws Not signed in without inserting when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      createPlant({ name: "Pothos", species: "Epipremnum aureum", location: null, acquired_at: null, nickname: null })
    ).rejects.toThrow("Not signed in");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("inserts with owner_id from the signed-in user and maps all fields", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { id: "p1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await createPlant({
      name: "Pothos",
      species: "Epipremnum aureum",
      location: "Living room",
      acquired_at: "2026-01-01",
      nickname: "Big Fred",
    });

    expect(chain.insert).toHaveBeenCalledWith({
      owner_id: "u1",
      name: "Pothos",
      species: "Epipremnum aureum",
      location: "Living room",
      acquired_at: "2026-01-01",
      nickname: "Big Fred",
      photo_urls: null,
    });
  });

  it("wraps a provided photo_url as a single-element array", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const chain = createChainableQueryMock({ data: { id: "p1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await createPlant({
      name: "Pothos",
      species: "Epipremnum aureum",
      location: null,
      acquired_at: null,
      nickname: null,
      photo_url: "https://example.com/photos/u1/plants/x.jpg",
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ photo_urls: ["https://example.com/photos/u1/plants/x.jpg"] })
    );
  });
});

describe("updatePlantPhoto", () => {
  it("sets photo_urls to a single-element array when given a URL", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await updatePlantPhoto("p1", "https://example.com/photos/u1/plants/x.jpg");

    expect(chain.update).toHaveBeenCalledWith({ photo_urls: ["https://example.com/photos/u1/plants/x.jpg"] });
    expect(chain.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("clears photo_urls when given null", async () => {
    const chain = createChainableQueryMock({ data: { id: "p1" }, error: null });
    mockSupabase.from.mockReturnValue(chain);

    await updatePlantPhoto("p1", null);

    expect(chain.update).toHaveBeenCalledWith({ photo_urls: null });
  });
});
