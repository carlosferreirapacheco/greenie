import { formatDisplayDate } from "./dateFormat";

describe("formatDisplayDate", () => {
  it("formats a plain YYYY-MM-DD date without touching Date/timezones", () => {
    expect(formatDisplayDate("2026-07-09")).toBe("09-07-2026");
  });

  it("zero-pads a single-digit day and month", () => {
    expect(formatDisplayDate("2026-01-05")).toBe("05-01-2026");
  });

  it("formats a full ISO timestamp using local calendar getters", () => {
    // Constructed via local Date fields (not a UTC string) so the
    // expected output matches regardless of the machine's own timezone.
    const local = new Date(2026, 6, 19, 14, 30, 0); // July 19, 2026 local
    expect(formatDisplayDate(local.toISOString())).toBe("19-07-2026");
  });

  it("does not shift the calendar day for a timestamp near local midnight", () => {
    const local = new Date(2026, 6, 19, 23, 45, 0);
    expect(formatDisplayDate(local.toISOString())).toBe("19-07-2026");
  });
});
