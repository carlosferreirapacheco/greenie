import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { computeChartPoints } from "../lib/chart";
import { getFonts, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { formatDisplayDate } from "../lib/dateFormat";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 100;

// Thin presentational wrapper around computeChartPoints() -- entries
// must already be sorted chronologically oldest -> newest (the chart
// always reads left to right through time, independent of how any
// list showing the same data is ordered).
export function HeightChart({
  entries,
  fonts,
}: {
  entries: { created_at: string; height_cm: number }[];
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const points = computeChartPoints(
    entries.map((entry) => entry.height_cm),
    CHART_WIDTH,
    CHART_HEIGHT
  );

  if (points.length === 0) {
    return null;
  }

  const first = entries[0];
  const last = entries[entries.length - 1];

  return (
    <View style={styles.wrap}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={colors.moss}
          strokeWidth={2}
        />
        {points.map((p, index) => (
          <Circle key={index} cx={p.x} cy={p.y} r={3} fill={colors.moss} />
        ))}
      </Svg>
      <View style={styles.captionRow}>
        <Text style={[styles.caption, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("heightChart.captionEntry", { date: formatDisplayDate(first.created_at), height: first.height_cm })}
        </Text>
        <Text style={[styles.caption, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("heightChart.captionEntry", { date: formatDisplayDate(last.created_at), height: last.height_cm })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xs,
  },
  captionRow: {
    width: CHART_WIDTH,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  caption: {
    fontSize: 11.5,
  },
});
