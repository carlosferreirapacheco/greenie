import {
  addYears,
  buildMonthDate,
  clampMonthToYear,
  getYearMonth,
  getYearPage,
  isMonthOutOfRange,
  isYearOutOfRange,
  shiftMonth,
} from "./dateGrid";

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

describe("shiftMonth", () => {
  it("shifts forward within the same year", () => {
    expect(shiftMonth(2026, 6, 1)).toEqual({ year: 2026, month0: 7 });
  });

  it("shifts backward within the same year", () => {
    expect(shiftMonth(2026, 6, -1)).toEqual({ year: 2026, month0: 5 });
  });

  it("rolls over December into January of the next year", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
  });

  it("rolls over January into December of the previous year", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
  });
});

describe("clampMonthToYear", () => {
  it("leaves the month unchanged when no bounds are set", () => {
    expect(clampMonthToYear(7, 2027)).toBe(7);
  });

  it("clamps down to maxDate's month when the browsed month is later in maxDate's year", () => {
    // Browsing August (7) in 2027, maxDate caps at July (6) 2027.
    expect(clampMonthToYear(7, 2027, undefined, "2027-07-12")).toBe(6);
  });

  it("clamps up to minDate's month when the browsed month is earlier in minDate's year", () => {
    // Browsing January (0) in 2026, minDate starts at July (6) 2026.
    expect(clampMonthToYear(0, 2026, "2026-07-12")).toBe(6);
  });

  it("does not clamp a year that isn't minDate's or maxDate's own year", () => {
    expect(clampMonthToYear(7, 2026, "2026-07-12", "2027-07-12")).toBe(7);
  });
});
