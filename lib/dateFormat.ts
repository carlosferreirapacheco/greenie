// Fixed dd-MM-yyyy display format everywhere -- deliberately not
// locale-dependent (a product decision independent of the app's
// language setting, unlike lib/i18n/'s translated strings).

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Two input shapes, both needing to preserve the exact calendar day
// already shown today -- only the output format changes:
// - plain YYYY-MM-DD dates (e.g. acquired_at): string-split, no Date
//   object involved, matching lib/dateGrid.ts's getYearMonth() --
//   new Date("YYYY-MM-DD") parses as UTC, which can shift the day near
//   midnight in timezones behind/ahead of UTC.
// - full ISO timestamps (e.g. created_at, which carry a real
//   time-of-day meant to display in the viewer's local time): parsed
//   via Date and read with local getters, same as the
//   Intl.DateTimeFormat(undefined, ...) calls this replaces.
export function formatDisplayDate(input: string): string {
  if (!input.includes("T")) {
    const [year, month, day] = input.split("-");
    return `${day}-${month}-${year}`;
  }

  const date = new Date(input);
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}
