jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./client";
import { lookupPlantByPhoto, lookupPlantInfo } from "./ai";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("lookupPlantInfo", () => {
  it("invokes the lookup-plant function with the query, locale, and returns its data", async () => {
    const data = { name: "Pothos", species: "Epipremnum aureum", wateringFrequencyDays: 7 };
    mockSupabase.functions.invoke.mockResolvedValue({ data, error: null });

    const result = await lookupPlantInfo("my new plant", "en");

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("lookup-plant", {
      body: { query: "my new plant", locale: "en" },
    });
    expect(result).toEqual(data);
  });

  it("normalizes a Supabase error into a single generic message, not the raw error", async () => {
    const err = { message: "Edge Function returned a non-2xx status code" };
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(lookupPlantInfo("x", "en")).rejects.toThrow("AI lookup failed");
  });

  it("logs the real reason from a FunctionsHttpError's response body without throwing it to the caller", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const response = new Response(JSON.stringify({ error: "Could not fetch photo: HTTP 404" }));
    const httpError = new FunctionsHttpError(response);
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: httpError });

    await expect(lookupPlantInfo("x", "en")).rejects.toThrow("AI lookup failed");
    expect(consoleError).toHaveBeenCalledWith(
      "lookup-plant failed:",
      expect.objectContaining({ error: "Could not fetch photo: HTTP 404" })
    );

    consoleError.mockRestore();
  });

  it("throws the same generic message when the function returns no data at all", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });

    await expect(lookupPlantInfo("x", "en")).rejects.toThrow("AI lookup failed");
  });
});

describe("lookupPlantByPhoto", () => {
  it("invokes the lookup-plant function with the photo url, hint, locale, and returns its data", async () => {
    const data = {
      status: "found" as const,
      name: "Pothos",
      species: "Epipremnum aureum",
      wateringFrequencyDays: 7,
      candidateNames: [],
    };
    mockSupabase.functions.invoke.mockResolvedValue({ data, error: null });

    const result = await lookupPlantByPhoto("https://example.com/photo.jpg", "pothos", "pt-PT");

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("lookup-plant", {
      body: { photoUrl: "https://example.com/photo.jpg", hint: "pothos", locale: "pt-PT" },
    });
    expect(result).toEqual(data);
  });

  it("invokes without a hint when none is given", async () => {
    const data = { status: "not_found" as const, name: "", species: "", wateringFrequencyDays: 0, candidateNames: [] };
    mockSupabase.functions.invoke.mockResolvedValue({ data, error: null });

    await lookupPlantByPhoto("https://example.com/photo.jpg", undefined, "en");

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("lookup-plant", {
      body: { photoUrl: "https://example.com/photo.jpg", hint: undefined, locale: "en" },
    });
  });

  it("normalizes a Supabase error into a single generic message, not the raw error", async () => {
    const err = { message: "Edge Function returned a non-2xx status code" };
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: err });

    await expect(lookupPlantByPhoto("https://example.com/photo.jpg", undefined, "en")).rejects.toThrow(
      "AI lookup failed"
    );
  });

  it("throws the same generic message when the function returns no data at all", async () => {
    mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });

    await expect(lookupPlantByPhoto("https://example.com/photo.jpg", undefined, "en")).rejects.toThrow(
      "AI lookup failed"
    );
  });
});
