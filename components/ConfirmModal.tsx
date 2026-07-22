import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

export type ConfirmModalAction = {
  label: string;
  onPress: () => void;
  tone?: "primary" | "destructive";
};

// Shared confirm/choice modal, styled identically to app/add-plant.tsx's
// AI-lookup ambiguity modal (same backdrop/card/button styles, lifted
// verbatim) so every converted inline prompt in the app looks like that
// reference design. Callers render this element itself conditionally
// (`{show ? <ConfirmModal ... /> : null}`) rather than toggling a
// `visible` prop -- RN Web doesn't reliably hide Modal content on
// `visible={false}` alone (same gotcha documented in DatePickerField.tsx
// and add-plant.tsx).
//
// Stays open through an in-flight action (busy spinner, disabled
// buttons) and only closes when the caller clears whatever state drives
// it -- on failure the caller is expected to keep that state set and
// pass errorText, so the prompt stays open for a retry or cancel instead
// of silently vanishing.
export function ConfirmModal({
  message,
  actions,
  onCancel,
  cancelLabel,
  busy,
  errorText,
  fonts,
}: {
  message: string;
  actions: ConfirmModalAction[];
  onCancel: () => void;
  cancelLabel?: string;
  busy?: boolean;
  errorText?: string | null;
  fonts: ReturnType<typeof getFonts>;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Empty onPress swallows the touch so it doesn't bubble to the backdrop's close handler. */}
        <Pressable style={[styles.card, { backgroundColor: colors.paperRaised }]} onPress={() => {}}>
          <Text style={[styles.promptText, { fontFamily: fonts.body, color: colors.ink }]}>{message}</Text>

          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={[
                styles.promptButton,
                { backgroundColor: action.tone === "destructive" ? colors.coralSoft : colors.sage },
              ]}
              onPress={action.onPress}
              disabled={busy}
            >
              <Text
                style={[
                  styles.promptButtonText,
                  { fontFamily: fonts.bodyMedium, color: action.tone === "destructive" ? colors.coral : colors.mossStrong },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}

          {busy ? (
            <View style={styles.promptLoading}>
              <ActivityIndicator color={colors.moss} />
            </View>
          ) : null}
          {errorText ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{errorText}</Text>
          ) : null}

          <Pressable style={styles.promptSecondaryButton} onPress={onCancel} disabled={busy}>
            <Text style={[styles.promptSecondaryText, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
              {cancelLabel ?? t("common.cancel")}
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
    maxWidth: 360,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  promptText: {
    fontSize: 15,
  },
  promptButton: {
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  promptButtonText: {
    fontSize: 14,
  },
  promptSecondaryButton: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  promptSecondaryText: {
    fontSize: 14,
  },
  promptLoading: {
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
  },
});
