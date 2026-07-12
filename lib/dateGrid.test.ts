import { addYears, buildMonthDate, getYearMonth, getYearPage, isMonthOutOfRange, isYearOutOfRange } from "./dateGrid";

describe("getYearMonth", () => {
  it("parses year and 0-indexed month", () => {
    expect(getYearMonth("2026-07-12")).toEqual({ year: 2026, month0: 6 });
  });

  it("parses a single-digit month correctly", () => {
    expect(getYearMonth("2026-01-05")).toEqual({ year: 2026, month0: 0 });
  });
});

describe("buildMonthDate", () => {
  it("zero-pads months under 10", () => {
    expect(buildMonthDate(2026, 0)).toBe("2026-01-01");
  });

  it("does not pad months 10 and above", () => {
    expect(buildMonthDate(2026, 11)).toBe("2026-12-01");
  });
});

describe("getYearPage", () => {
  it("returns 12 ascending consecutive years with centerYear at index 5", () => {
    const page = getYearPage(2026);
    expect(page).toHaveLength(12);
    expect(page[5]).toBe(2026);
    expect(page).toEqual([2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]);
  });
});

describe("addYears", () => {
  it("shifts the year while keeping month and day", () => {
    expect(addYears("2026-07-12", 1)).toBe("2027-07-12");
  });

  it("supports shifting backwards", () => {
    expect(addYears("2026-07-12", -1)).toBe("2025-07-12");
  });
});

describe("isMonthOutOfRange", () => {
  it("is false when no bounds are set", () => {
    expect(isMonthOutOfRange(2026, 6)).toBe(false);
  });

  it("is true below minDate's month", () => {
    expect(isMonthOutOfRange(2026, 5, "2026-07-01")).toBe(true);
  });

  it("is true above maxDate's month", () => {
    expect(isMonthOutOfRange(2026, 7, undefined, "2026-07-31")).toBe(true);
  });

  it("is false within range", () => {
    expect(isMonthOutOfRange(2026, 6, "2026-01-01", "2026-12-31")).toBe(false);
  });
});

describe("isYearOutOfRange", () => {
  it("is false when no bounds are set", () => {
    expect(isYearOutOfRange(2026)).toBe(false);
  });

  it("is true below minDate's year", () => {
    expect(isYearOutOfRange(2025, "2026-07-01")).toBe(true);
  });

  it("is true above maxDate's year", () => {
    expect(isYearOutOfRange(2028, undefined, "2027-07-01")).toBe(true);
  });

  it("is false within range", () => {
    expect(isYearOutOfRange(2026, "2020-01-01", "2030-01-01")).toBe(false);
  });
});
