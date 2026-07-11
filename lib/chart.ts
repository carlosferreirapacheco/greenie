export type ChartPoint = { x: number; y: number };

// Pure scaling logic for a simple line chart, kept separate from the
// SVG component for testability. Points are spaced evenly by index,
// not date-proportionally -- a deliberate simplification for a
// lightweight sparkline, not a full time-scale chart.
export function computeChartPoints(
  values: number[],
  width: number,
  height: number,
  padding: number = 12
): ChartPoint[] {
  if (values.length === 0) {
    return [];
  }

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  if (values.length === 1) {
    return [{ x: width / 2, y: height / 2 }];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return values.map((value, index) => {
    const x = padding + (innerWidth * index) / (values.length - 1);
    // range === 0 means every value is identical -- draw a flat line
    // at mid-height rather than dividing by zero.
    const y = range === 0 ? height / 2 : padding + innerHeight * (1 - (value - min) / range);
    return { x, y };
  });
}
