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

  it("constructs a client when both env vars are present", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

    const { supabase } = require("./client");
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
    expect(typeof supabase.auth.getUser).toBe("function");
  });
});
