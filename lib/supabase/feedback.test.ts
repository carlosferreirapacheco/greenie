jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { FeedbackRateLimitedError, submitFeedback } from "./feedback";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

const PROFILE_ROW = { id: "u1", username: "sammy", email: "sammy@example.com" };

function mockProfile() {
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1", email: PROFILE_ROW.email } } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("submitFeedback", () => {
  it("attaches the signed-in user's id, username, and email to the row", async () => {
    mockProfile();
    const profileChain = createChainableQueryMock({
      data: { id: "u1", username: "sammy" },
      error: null,
    });
    const feedbackChain = createChainableQueryMock({ data: null, error: null });
    mockSupabase.from.mockImplementation((table: string) => (table === "profiles" ? profileChain : feedbackChain));

    await submitFeedback({ type: "bug", description: "it crashed", photoUrls: ["https://example.com/a.jpg"] });

    expect(mockSupabase.from).toHaveBeenCalledWith("app_feedback");
    expect(feedbackChain.insert).toHaveBeenCalledWith({
      user_id: "u1",
      username: "sammy",
      email: "sammy@example.com",
      type: "bug",
      description: "it crashed",
      photo_urls: ["https://example.com/a.jpg"],
    });
  });

  it("throws FeedbackRateLimitedError when the DB rejects with P0001", async () => {
    mockProfile();
    const profileChain = createChainableQueryMock({ data: { id: "u1", username: "sammy" }, error: null });
    const feedbackChain = createChainableQueryMock({
      data: null,
      error: { code: "P0001", message: "Please wait a minute before submitting again." },
    });
    mockSupabase.from.mockImplementation((table: string) => (table === "profiles" ? profileChain : feedbackChain));

    await expect(
      submitFeedback({ type: "suggestion", description: "add dark mode", photoUrls: [] })
    ).rejects.toBeInstanceOf(FeedbackRateLimitedError);
  });

  it("throws the raw Supabase error for any other failure", async () => {
    mockProfile();
    const profileChain = createChainableQueryMock({ data: { id: "u1", username: "sammy" }, error: null });
    const err = { code: "23505", message: "db error" };
    const feedbackChain = createChainableQueryMock({ data: null, error: err });
    mockSupabase.from.mockImplementation((table: string) => (table === "profiles" ? profileChain : feedbackChain));

    await expect(submitFeedback({ type: "other", description: "hi", photoUrls: [] })).rejects.toBe(err);
  });
});
