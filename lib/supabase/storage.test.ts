jest.mock("./client", () => {
  const { createMockSupabaseClient } = require("./testUtils/mockClient");
  return { supabase: createMockSupabaseClient() };
});

import { supabase } from "./client";
import { buildPhotoPath, uploadPhoto, deletePhotoByUrl } from "./storage";

const mockSupabase = supabase as unknown as ReturnType<
  typeof import("./testUtils/mockClient").createMockSupabaseClient
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("buildPhotoPath", () => {
  it("shapes the path as userId/context/filename.ext", () => {
    const path = buildPhotoPath("user1", "plants", "jpg");
    expect(path).toMatch(/^user1\/plants\/[0-9]+-[a-z0-9]+\.jpg$/);
  });

  it("produces a different path on each call", () => {
    const first = buildPhotoPath("user1", "avatars", "jpg");
    const second = buildPhotoPath("user1", "avatars", "jpg");
    expect(first).not.toBe(second);
  });
});

describe("uploadPhoto", () => {
  it("throws Not signed in when there's no session", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(uploadPhoto({ base64: "abc", context: "plants" })).rejects.toThrow("Not signed in");
  });

  it("uploads to the photos bucket under the user's folder and returns the public URL", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user1" } } });
    const upload = jest.fn().mockResolvedValue({ data: { path: "user1/plants/x.jpg" }, error: null });
    const getPublicUrl = jest
      .fn()
      .mockReturnValue({ data: { publicUrl: "https://example.com/storage/v1/object/public/photos/user1/plants/x.jpg" } });
    (mockSupabase.storage.from as jest.Mock).mockReturnValue({ upload, getPublicUrl });

    const url = await uploadPhoto({ base64: "abc", context: "plants", fileExtension: "jpg" });

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("photos");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user1\/plants\//),
      expect.anything(),
      expect.objectContaining({ contentType: "image/jpeg", upsert: false })
    );
    expect(url).toBe("https://example.com/storage/v1/object/public/photos/user1/plants/x.jpg");
  });

  it("throws the Supabase error on upload failure", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user1" } } });
    const err = { message: "storage error" };
    const upload = jest.fn().mockResolvedValue({ data: null, error: err });
    (mockSupabase.storage.from as jest.Mock).mockReturnValue({ upload });

    await expect(uploadPhoto({ base64: "abc", context: "avatars" })).rejects.toBe(err);
  });
});

describe("deletePhotoByUrl", () => {
  it("removes the parsed path from the photos bucket", async () => {
    const remove = jest.fn().mockResolvedValue({ data: [], error: null });
    (mockSupabase.storage.from as jest.Mock).mockReturnValue({ remove });

    await deletePhotoByUrl("https://example.com/storage/v1/object/public/photos/user1/plants/x.jpg");

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("photos");
    expect(remove).toHaveBeenCalledWith(["user1/plants/x.jpg"]);
  });

  it("no-ops on a URL the bucket didn't produce", async () => {
    await deletePhotoByUrl("https://example.com/some-other-file.jpg");

    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("throws the Supabase error on remove failure", async () => {
    const err = { message: "storage error" };
    const remove = jest.fn().mockResolvedValue({ data: null, error: err });
    (mockSupabase.storage.from as jest.Mock).mockReturnValue({ remove });

    await expect(
      deletePhotoByUrl("https://example.com/storage/v1/object/public/photos/user1/plants/x.jpg")
    ).rejects.toBe(err);
  });
});
