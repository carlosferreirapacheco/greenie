import { notificationTargetPath, parseStoredFlag } from "./pushNotifications";

describe("parseStoredFlag", () => {
  it("defaults to on when the key was never set", () => {
    expect(parseStoredFlag(null)).toBe(true);
  });

  it("stays off once persisted off (e.g. after a permission denial)", () => {
    expect(parseStoredFlag("false")).toBe(false);
  });

  it("stays on when explicitly enabled", () => {
    expect(parseStoredFlag("true")).toBe(true);
  });
});

describe("notificationTargetPath", () => {
  it("routes comment/like to the report", () => {
    expect(notificationTargetPath("comment", { progressId: "pr1" })).toBe("/progress/pr1");
    expect(notificationTargetPath("like", { progressId: "pr1" })).toBe("/progress/pr1");
  });

  it("routes follow kinds", () => {
    expect(notificationTargetPath("follow_request", {})).toBe("/follow-requests");
    expect(notificationTargetPath("new_follower", { actorId: "u1" })).toBe("/user/u1");
    expect(notificationTargetPath("follow_accepted", { actorId: "u1" })).toBe("/user/u1");
  });

  it("routes sitting kinds to the Plant Sitting hub", () => {
    expect(notificationTargetPath("sitting_request", {})).toBe("/plant-sitting");
    expect(notificationTargetPath("sitting_accepted", {})).toBe("/plant-sitting");
    expect(notificationTargetPath("sitting_declined", {})).toBe("/plant-sitting");
  });

  it("routes care_due to the plant", () => {
    expect(notificationTargetPath("care_due", { plantId: "pl1" })).toBe("/plant/pl1");
  });

  it("returns null when the id a kind needs is missing", () => {
    expect(notificationTargetPath("comment", {})).toBeNull();
    expect(notificationTargetPath("new_follower", {})).toBeNull();
    expect(notificationTargetPath("care_due", {})).toBeNull();
  });

  it("returns null for unknown kinds (untyped push payloads)", () => {
    expect(notificationTargetPath("mystery", { plantId: "pl1" })).toBeNull();
  });
});
