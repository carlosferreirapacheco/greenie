import { computeChartPoints } from "./chart";

describe("computeChartPoints", () => {
  it("returns an empty array for no values", () => {
    expect(computeChartPoints([], 100, 100)).toEqual([]);
  });

  it("centers a single point", () => {
    const result = computeChartPoints([42], 100, 60);
    expect(result).toEqual([{ x: 50, y: 30 }]);
  });

  it("spaces x evenly by index, not by value", () => {
    const result = computeChartPoints([10, 20, 30, 40], 100, 100, 0);
    expect(result.map((p) => p.x)).toEqual([0, 100 / 3, (2 * 100) / 3, 100]);
  });

  it("scales y so the max value is at the top and the min at the bottom", () => {
    const result = computeChartPoints([10, 20], 100, 100, 10);
    // First value (10) is the min -> bottom (y = height - padding).
    // Second value (20) is the max -> top (y = padding).
    expect(result[0].y).toBe(90);
    expect(result[1].y).toBe(10);
  });

  it("draws a flat mid-height line when every value is identical", () => {
    const result = computeChartPoints([5, 5, 5], 100, 80);
    expect(result.every((p) => p.y === 40)).toBe(true);
  });

  it("respects the padding on both axes", () => {
    const result = computeChartPoints([0, 100], 200, 100, 20);
    expect(result[0].x).toBe(20);
    expect(result[1].x).toBe(180);
  });
});
