// Pure helpers for DatePickerField's month/year quick-navigation grids,
// kept separate from the component for testability (same split as
// lib/chart.ts / components/HeightChart.tsx). Dates are parsed by
// string-splitting rather than Date/toISOString() -- avoids timezone
// pitfalls, and YYYY-MM-DD is already the format used everywhere else.

export function getYearMonth(dateString: string): { year: number; month0: number } {
  const [year, month] = dateString.split("-");
  return { year: Number(year), month0: Number(month) - 1 };
}

export function buildMonthDate(year: number, month0: number): string {
  const month = String(month0 + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

// 12 consecutive years with centerYear at index 5 (5 before, 6 after)
// -- no alignment-to-decade logic, just centers the requested year,
// which is enough for stable +/-12 paging from the component.
export function getYearPage(centerYear: number): number[] {
  const start = centerYear - 5;
  return Array.from({ length: 12 }, (_, i) => start + i);
}
