import { Pressable, StyleSheet, Text, View } from "react-native";
import { badgeKey, badgeLabelKey, type ResolvedBadge } from "../../lib/badges";
import { getBadgeColors, getFonts, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { BadgeIcon } from "./BadgeIcon";

// Settings-only interactive sibling of BadgeChipRow: same chip visual,
// but each badge is itself the press target for its own visibility
// toggle -- full tier/moss color when enabled, greyed out when disabled.
export function BadgeToggleRow({
  badges,
  isEnabled,
  onToggle,
  fonts,
}: {
  badges: ResolvedBadge[];
  isEnabled: (badge: ResolvedBadge) => boolean;
  onToggle: (badge: ResolvedBadge) => void;
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors, scheme } = useTheme();
  const { t } = useLanguage();

  if (badges.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {badges.map((badge) => {
        const enabled = isEnabled(badge);
        const { fg, soft } = getBadgeColors(badge, scheme, colors);
        const borderColor = enabled ? fg : colors.line;
        const backgroundColor = enabled ? soft : colors.paperRaised;
        const contentColor = enabled ? fg : colors.inkSoft;
        return (
          <Pressable
            key={badgeKey(badge)}
            onPress={() => onToggle(badge)}
            style={[styles.chip, { borderColor, backgroundColor }]}
          >
            <BadgeIcon badge={badge} size={13} color={contentColor} />
            <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: contentColor }]}>
              {t(badgeLabelKey(badge))}
            </Text>
          </Pressable>
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
