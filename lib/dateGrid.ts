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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Local Date getters, not toISOString() -- toISOString() converts to
// UTC, which can report the wrong calendar day near midnight in
// timezones behind/ahead of UTC. Matters here since this drives
// inclusive min/max date limits, not just a default view.
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function addYears(dateString: string, years: number): string {
  const { year, month0 } = getYearMonth(dateString);
  const day = Number(dateString.split("-")[2]);
  const shifted = new Date(year + years, month0, day);
  return `${shifted.getFullYear()}-${pad2(shifted.getMonth() + 1)}-${pad2(shifted.getDate())}`;
}

// YYYY-MM-DD strings compare correctly as plain strings, so these
// just compare "YYYY-MM"/"YYYY" prefixes against the bounds -- no
// Date parsing needed (same reasoning as request-sitting.tsx's
// existing rangeIsValid check).
export function isMonthOutOfRange(year: number, month0: number, minDate?: string, maxDate?: string): boolean {
  const monthKey = buildMonthDate(year, month0).slice(0, 7);
  if (minDate && monthKey < minDate.slice(0, 7)) return true;
  if (maxDate && monthKey > maxDate.slice(0, 7)) return true;
  return false;
}

export function isYearOutOfRange(year: number, minDate?: string, maxDate?: string): boolean {
  if (minDate && year < Number(minDate.slice(0, 4))) return true;
  if (maxDate && year > Number(maxDate.slice(0, 4))) return true;
  return false;
}

// Pure integer math, not a Date object -- delta months from (year,
// month0) with correct year wraparound in either direction.
export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const total = month0 + delta;
  return { year: year + Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

// Picking a year in the year grid keeps whatever month was already
// being browsed -- but that month might not exist in the new year's
// valid range (e.g. browsing August, maxDate caps at July of the next
// year: jumping there would land on an entirely-out-of-range month).
// Clamps to the nearest valid month for that specific year.
export function clampMonthToYear(month0: number, year: number, minDate?: string, maxDate?: string): number {
  let clamped = month0;
  if (minDate) {
    const min = getYearMonth(minDate);
    if (year === min.year) clamped = Math.max(clamped, min.month0);
  }
  if (maxDate) {
    const max = getYearMonth(maxDate);
    if (year === max.year) clamped = Math.min(clamped, max.month0);
  }
  return clamped;
}
