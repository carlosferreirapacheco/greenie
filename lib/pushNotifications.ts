// Pure logic for OS push notifications, kept free of
// expo-notifications/AsyncStorage imports so it's unit-testable --
// the native token/permission handling lives in
// pushNotificationManager.ts.

// Device-local (AsyncStorage) on purpose: whether THIS device gets
// pushes is a device concern; what gets created at all is governed by
// the account-wide per-kind notify_* toggles.
export const PUSH_ENABLED_STORAGE_KEY = "pushEnabled";

// Push defaults ON: an unset key counts as enabled, and refusing the
// OS notification permission persists "false" so we never re-ask.
export function parseStoredFlag(value: string | null): boolean {
  return value === null ? true : value === "true";
}

export type NotificationTargetParams = {
  progressId?: string | null;
  actorId?: string | null;
  plantId?: string | null;
};

// Where a notification of a given kind should land when opened --
// shared by the in-app inbox rows and the push tap handler, so both
// always agree. Takes a plain string type since push payload data is
// untyped over the wire; unknown kinds resolve to null (no-op tap).
export function notificationTargetPath(
  type: string,
  params: NotificationTargetParams
): string | null {
  switch (type) {
    case "comment":
    case "like":
      return params.progressId ? `/progress/${params.progressId}` : null;
    case "follow_request":
      return "/follow-requests";
    case "new_follower":
    case "follow_accepted":
      return params.actorId ? `/user/${params.actorId}` : null;
    case "sitting_request":
    case "sitting_accepted":
    case "sitting_declined":
      return "/plant-sitting";
    case "care_due":
      return params.plantId ? `/plant/${params.plantId}` : null;
    default:
      return null;
  }
}
