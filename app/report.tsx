import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { REPORT_REASONS, submitReport, type ReportReason, type ReportTargetType } from "../lib/supabase/reports";
import { blockUser } from "../lib/supabase/blocks";
import { ChipGroup } from "../components/ChipGroup";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

export default function ReportScreen() {
  const { targetType, targetId, authorId } = useLocalSearchParams<{
    targetType: ReportTargetType;
    targetId: string;
    authorId: string;
  }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  // Reporting a user account directly is redundant with that profile's
  // own Block button, so this checkbox only makes sense for content
  // reports (progress report / comment), where the author isn't
  // otherwise one tap away from being blocked.
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx and app/log-progress.tsx.
  const isSubmitting = useRef(false);

  async function handleSubmit() {
    if (!targetType || !targetId || isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;

    setSubmitStatus("submitting");
    setSubmitError(null);
    setBlockError(null);

    try {
      await submitReport({
        targetType,
        targetId,
        reason,
        details: details.trim().length > 0 ? details.trim() : null,
      });

      if (alsoBlock && authorId) {
        try {
          await blockUser(authorId);
        } catch (err) {
          // The report itself already succeeded -- don't lose that over
          // a secondary failure, just surface it alongside the success state.
          setBlockError(getErrorMessage(err));
        }
      }

      setSubmitStatus("submitted");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setSubmitStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  if (submitStatus === "submitted") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("report.screenTitle") }} />
        <Text style={[styles.successText, { fontFamily: fonts.body, color: colors.ink }]}>
          {t("report.successMessage")}
        </Text>
        {blockError ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
            {t("report.blockFailed", { error: blockError })}
          </Text>
        ) : null}
        <Pressable style={[styles.saveButton, { backgroundColor: colors.moss }]} onPress={() => router.back()}>
          <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
            {t("report.doneButton")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: t("report.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("report.reasonLabel")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={reason}
            onChange={setReason}
            options={REPORT_REASONS.map((value) => ({ value, label: t(`report.reasons.${value}`) }))}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("report.detailsLabel")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={details}
            onChangeText={setDetails}
            placeholder={t("report.detailsPlaceholder")}
            placeholderTextColor={colors.inkSoft}
            multiline
          />
        </View>

        {targetType !== "user" && authorId ? (
          <Pressable style={styles.checkboxRow} onPress={() => setAlsoBlock((prev) => !prev)} hitSlop={4}>
            <View
              style={[
                styles.checkbox,
                { borderColor: colors.line },
                alsoBlock && { backgroundColor: colors.sage, borderColor: colors.sage },
              ]}
            />
            <Text style={[styles.checkboxLabel, { fontFamily: fonts.body, color: colors.ink }]}>
              {t("report.alsoBlock")}
            </Text>
          </Pressable>
        ) : null}

        {submitStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{submitError}</Text>
        ) : null}

        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.moss }]}
          onPress={handleSubmit}
          disabled={submitStatus === "submitting"}
        >
          {submitStatus === "submitting" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {t("report.submitButton")}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: "top",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 13,
  },
  successText: {
    fontSize: 15,
    textAlign: "center",
  },
  saveButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
  },
});
