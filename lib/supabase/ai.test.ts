jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { lookupPlantByPhoto, lookupPlantInfo } from "./ai";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("lookupPlantInfo", () => {
  it("invokes the lookup-plant function with the query and returns its data", async () => {
    const data = { name: "Pothos", species: "Epipremnum aureum", wateringFrequencyDays: 7 };
    mockSupabase.functions.invoke.mockResolvedValue({ data, error: null });

    const result = await lookupPlantInfo("my new plant");

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("lookup-plant", { body: { query: "my new plant" } });
    expect(result).toEqual(data);
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "Lookup failed" };
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(lookupPlantInfo("x")).rejects.toBe(err);
  });

  it("throws when the function returns no data at all", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });

    await expect(lookupPlantInfo("x")).rejects.toThrow("Lookup returned no data");
  });
});

describe("lookupPlantByPhoto", () => {
  it("invokes the lookup-plant function with the photo url and hint, and returns its data", async () => {
    const data = {
      status: "found" as const,
      name: "Pothos",
      species: "Epipremnum aureum",
      wateringFrequencyDays: 7,
      candidateNames: [],
    };
    mockSupabase.functions.invoke.mockResolvedValue({ data, error: null });

    const result = await lookupPlantByPhoto("https://example.com/photo.jpg", "pothos");

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("lookup-plant", {
      body: { photoUrl: "https://example.com/photo.jpg", hint: "pothos" },
    });
    expect(result).toEqual(data);
  });

  it("invokes without a hint when none is given", async () => {
    const data = { status: "not_found" as const, name: "", species: "", wateringFrequencyDays: 0, candidateNames: [] };
    mockSupabase.functions.invoke.mockResolvedValue({ data, error: null });

    await lookupPlantByPhoto("https://example.com/photo.jpg");

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("lookup-plant", {
      body: { photoUrl: "https://example.com/photo.jpg", hint: undefined },
    });
  });

  it("throws the Supabase error on failure", async () => {
    const err = { message: "Lookup failed" };
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(lookupPlantByPhoto("https://example.com/photo.jpg")).rejects.toBe(err);
  });

  it("throws when the function returns no data at all", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });

    await expect(lookupPlantByPhoto("https://example.com/photo.jpg")).rejects.toThrow("Lookup returned no data");
  });
});
