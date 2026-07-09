// client.ts reads its config from process.env at module-load time, so each
// test resets the module registry and re-requires it with a controlled env,
// rather than depending on whatever real .env values happen to be loaded.

describe("supabase client bootstrap", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws a clear error when the Supabase URL env var is missing", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    expect(() => require("./client")).toThrow(/Missing EXPO_PUBLIC_SUPABASE_URL/);
  });

  it("throws a clear error when the Supabase publishable key env var is missing", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => require("./client")).toThrow(/Missing EXPO_PUBLIC_SUPABASE_URL/);
  });

  it("calls createClient with the configured url, key, and auth options", () => {
    // The real createClient() also spins up a Realtime WebSocket client,
    // whose availability depends on the runtime's WebSocket global -- not
    // something this test should depend on. Mocking createClient itself
    // keeps this test about *our* wiring (which url/key/options we pass),
    // not the SDK's own environment requirements.
    jest.doMock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({ mocked: true })) }));
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    const { createClient } = require("@supabase/supabase-js");
    const { Platform } = require("react-native");
    const { supabase } = require("./client");

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-publishable-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          // Web needs to pick the OAuth session out of the return URL;
          // native has no URL to read. jest-expo runs as iOS, so this
          // asserts the platform-conditional wiring, not a constant.
          detectSessionInUrl: Platform.OS === "web",
        }),
      })
    );
    expect(supabase).toEqual({ mocked: true });
  });
});
