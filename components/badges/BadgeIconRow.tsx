import { StyleSheet, View } from "react-native";
import { badgeKey, type ResolvedBadge } from "../../lib/badges";
import { getBadgeColors } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { BadgeIcon } from "./BadgeIcon";

// Treatment 1 -- icon only, no label, ~16px. Used everywhere a name
// renders except the profile screens (feed rows, progress-report
// author line, comment author lines). Renders nothing for an empty
// list so call sites can use it unconditionally.
export function BadgeIconRow({ badges, size = 16 }: { badges: ResolvedBadge[]; size?: number }) {
  const { colors, scheme } = useTheme();

  if (badges.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {badges.map((badge) => (
        <BadgeIcon key={badgeKey(badge)} badge={badge} size={size} color={getBadgeColors(badge, scheme, colors).fg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
});
