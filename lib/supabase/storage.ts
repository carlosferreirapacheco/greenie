import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "./client";

const BUCKET = "photos";

export type PhotoContext = "plants" | "avatars" | "progress";

// Every upload gets a fresh random filename (not just e.g. the plant
// id) so a replaced photo gets a new URL instead of colliding with a
// stale cached copy of the old file at the same path.
export function buildPhotoPath(userId: string, context: PhotoContext, fileExtension: string): string {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExtension}`;
  return `${userId}/${context}/${filename}`;
}

// Wraps the permission request + picker launch. Returns null on
// cancel or a denied permission -- not an error, matching this app's
// existing "backing out isn't a failure" convention (e.g. native
// Google sign-in's cancelled-browser-tab handling).
export async function pickImage(source: "camera" | "library"): Promise<{ base64: string; fileExtension: string } | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return null;
  }

  const launch = source === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;

  const result = await launch({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.6,
    base64: true,
  });

  if (result.canceled || !result.assets[0]?.base64) {
    return null;
  }

  return { base64: result.assets[0].base64, fileExtension: "jpg" };
}

export async function uploadPhoto(params: {
  base64: string;
  context: PhotoContext;
  fileExtension?: string;
  contentType?: string;
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const path = buildPhotoPath(user.id, params.context, params.fileExtension ?? "jpg");

  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(params.base64), {
    contentType: params.contentType ?? "image/jpeg",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

// Called right after a successful re-upload by every "replace photo"
// flow, so repeated edits don't leak storage objects indefinitely.
// Known gap (not fixed here): deleting a plant/report/account doesn't
// cascade-delete its Storage objects -- Postgres FK cascades don't
// reach storage.objects. Acceptable for v1; a cleanup job is separate
// future work.
export async function deletePhotoByUrl(url: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`;
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    // Not a URL this bucket produced (e.g. already null, or external) --
    // nothing to clean up.
    return;
  }

  const path = url.slice(markerIndex + marker.length);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    throw error;
  }
}
