import { buildMonthDate, getYearMonth, getYearPage } from "./dateGrid";

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
