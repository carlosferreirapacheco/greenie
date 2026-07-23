import { StyleSheet, Text, View } from "react-native";
import { badgeKey, badgeLabelKey, type ResolvedBadge } from "../../lib/badges";
import { getBadgeColors, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { BadgeIcon } from "./BadgeIcon";

// Treatment 3 -- outlined pill (border + soft background in the
// badge's own color, icon + translated label). Profile screens only,
// positioned under the display name.
export function BadgeChipRow({ badges, fonts }: { badges: ResolvedBadge[]; fonts: ReturnType<typeof getFonts> }) {
  const { colors, scheme } = useTheme();
  const { t } = useLanguage();

  if (badges.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {badges.map((badge) => {
        const { fg, soft } = getBadgeColors(badge, scheme, colors);
        return (
          <View key={badgeKey(badge)} style={[styles.chip, { borderColor: fg, backgroundColor: soft }]}>
            <BadgeIcon badge={badge} size={13} color={fg} />
            <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: fg }]}>{t(badgeLabelKey(badge))}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.3,
    borderRadius: radius.lg,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  label: {
    fontSize: 11.5,
  },
});
