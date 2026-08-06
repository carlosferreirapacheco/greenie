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
    case "sitting_grace_day":
    case "sitting_grace_expired":
      return params.plantId ? `/plant/${params.plantId}` : null;
    default:
      return null;
  }
}

// Resolves a push response's raw `data` payload to a deep-link path --
// shared by the warm-app tap listener and the cold-start check (see
// pushNotificationManager.ts's addPushResponseListener/
// getInitialNotificationTargetPath) so both agree on the same logic.
// Untyped since push payload data is untyped over the wire.
export function resolvePushResponsePath(data: Record<string, unknown>): string | null {
  const asString = (value: unknown) => (typeof value === "string" ? value : null);

  if (typeof data.type === "string") {
    return notificationTargetPath(data.type, {
      progressId: asString(data.progressId),
      actorId: asString(data.actorId),
      plantId: asString(data.plantId),
    });
  }

  // Transition path: locally scheduled care reminders from before the
  // real push pipeline existed carry only { plantId }; any still
  // pending on a device should keep landing on their plant.
  if (typeof data.plantId === "string") {
    return `/plant/${data.plantId}`;
  }

  return null;
}

export type PresentedNotificationInfo = {
  identifier: string;
  type: unknown;
  plantId: unknown;
};

// Which currently-delivered OS notifications reference a plant that no
// longer exists (deleted or archived out from under an already-sent
// care_due push) -- callers dismiss these from the tray. Scoped to
// care_due specifically since that's the only kind carrying a plantId
// whose lifecycle this app can independently track; other kinds are
// left alone even if their payload happens to carry a plantId-shaped
// field.
export function identifiersForDeletedPlants(
  presented: PresentedNotificationInfo[],
  currentPlantIds: string[]
): string[] {
  const validIds = new Set(currentPlantIds);
  return presented
    .filter((n) => n.type === "care_due" && typeof n.plantId === "string" && !validIds.has(n.plantId))
    .map((n) => n.identifier);
}
