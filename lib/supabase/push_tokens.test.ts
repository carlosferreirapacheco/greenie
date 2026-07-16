jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { createChainableQueryMock } from "./testUtils/mockClient";
import { deletePushToken, upsertPushToken } from "./push_tokens";

const mockedFrom = supabase.from as jest.Mock;
const mockedGetUser = supabase.auth.getUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("upsertPushToken", () => {
  it("upserts the token for the signed-in user", async () => {
    mockedGetUser.mockResolvedValue({ data: { user: { id: "user1" } } });
    const chain = createChainableQueryMock({ data: null, error: null });
    mockedFrom.mockReturnValue(chain);

    await upsertPushToken("ExponentPushToken[abc]", "android");

    expect(mockedFrom).toHaveBeenCalledWith("push_tokens");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "ExponentPushToken[abc]",
        user_id: "user1",
        platform: "android",
      })
    );
  });

  it("throws when not signed in", async () => {
    mockedGetUser.mockResolvedValue({ data: { user: null } });

    await expect(upsertPushToken("t", "android")).rejects.toThrow("Not signed in");
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it("throws on a query error", async () => {
    mockedGetUser.mockResolvedValue({ data: { user: { id: "user1" } } });
    mockedFrom.mockReturnValue(createChainableQueryMock({ data: null, error: new Error("nope") }));

    await expect(upsertPushToken("t", "android")).rejects.toThrow("nope");
  });
});

describe("deletePushToken", () => {
  it("deletes by token", async () => {
    const chain = createChainableQueryMock({ data: null, error: null });
    mockedFrom.mockReturnValue(chain);

    await deletePushToken("ExponentPushToken[abc]");

    expect(mockedFrom).toHaveBeenCalledWith("push_tokens");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("token", "ExponentPushToken[abc]");
  });

  it("throws on a query error", async () => {
    mockedFrom.mockReturnValue(createChainableQueryMock({ data: null, error: new Error("nope") }));

    await expect(deletePushToken("t")).rejects.toThrow("nope");
  });
});
