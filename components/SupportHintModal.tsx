import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ALL_TIERS, TIER_THRESHOLDS, badgeLabelKey, type ResolvedBadge } from "../lib/badges";
import { getFonts, getSupporterTierColors, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { BadgeIcon } from "./badges/BadgeIcon";

// Shown before handing off to the external Buy Me a Coffee link --
// explains what a donation unlocks (the tier ladder, same icons/colors
// already used everywhere else badges render) and the one non-obvious
// step the bmc-webhook Edge Function needs to auto-match a donation:
// typing @username into BMC's own name/message field at checkout.
// Same conditionally-rendered-Modal pattern as ConfirmModal.tsx (RN
// Web doesn't reliably hide Modal content on visible={false} alone),
// but a dedicated component rather than forcing a 4-row icon list into
// ConfirmModal's single-message API.
export function SupportHintModal({
  onContinue,
  onCancel,
  fonts,
}: {
  onContinue: () => void;
  onCancel: () => void;
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors, scheme } = useTheme();
  const { t } = useLanguage();
  const tierColors = getSupporterTierColors(scheme, colors);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: colors.paperRaised }]} onPress={() => {}}>
          <Text style={[styles.title, { fontFamily: fonts.display, color: colors.ink }]}>
            {t("settings.support.hintModal.title")}
          </Text>
          <Text style={[styles.body, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("settings.support.hintModal.intro")}
          </Text>

          <View style={styles.tierList}>
            {ALL_TIERS.map((tier) => {
              const badge: ResolvedBadge = { kind: "supporter_tier", tier };
              const { fg } = tierColors[tier];
              return (
                <View key={tier} style={styles.tierRow}>
                  <BadgeIcon badge={badge} size={20} color={fg} />
                  <Text style={[styles.tierLabel, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                    {t(badgeLabelKey(badge))}
                  </Text>
                  <Text style={[styles.tierThreshold, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                    {t("settings.support.hintModal.tierThreshold", { amount: TIER_THRESHOLDS[tier] })}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={[styles.body, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("settings.support.hintModal.usernameNote")}
          </Text>

          <Pressable style={[styles.continueButton, { backgroundColor: colors.moss }]} onPress={onContinue}>
            <Text style={[styles.continueButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {t("settings.support.hintModal.continueButton")}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={[styles.cancelText, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
              {t("common.cancel")}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  tierList: {
    gap: spacing.xs,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  tierLabel: {
    fontSize: 14,
    flex: 1,
  },
  tierThreshold: {
    fontSize: 13,
  },
  continueButton: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  continueButtonText: {
    fontSize: 15,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  cancelText: {
    fontSize: 14,
  },
});
