import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { requestPlantSitting } from "../lib/supabase/plant_sitting";
import { getProfile, type Profile } from "../lib/supabase/profiles";
import { DatePickerField } from "../components/DatePickerField";
import { addYears, todayISO } from "../lib/dateGrid";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

export default function RequestSittingScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const [sitter, setSitter] = useState<Profile | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    getProfile(userId)
      .then(setSitter)
      .catch(() => {
        // Non-critical -- the screen still works without the name, just
        // with generic copy below.
      });
  }, [userId]);

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const today = todayISO();
  const maxSittingDate = addYears(today, 1);

  // Same synchronous-guard pattern as app/add-plant.tsx and app/log-progress.tsx.
  const isSaving = useRef(false);

  const rangeIsValid =
    startsAt.trim().length === 0 || endsAt.trim().length === 0 || startsAt.trim() <= endsAt.trim();

  const canSave = rangeIsValid && saveStatus !== "saving";

  async function handleSend() {
    if (!canSave || isSaving.current || !userId) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const trimmedStart = startsAt.trim();
      const trimmedEnd = endsAt.trim();
      await requestPlantSitting(userId, trimmedStart.length > 0 ? trimmedStart : null, trimmedEnd.length > 0 ? trimmedEnd : null);

      router.back();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  const sitterName = sitter?.display_name ?? (sitter ? `@${sitter.username}` : "this follower");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Request Plant-Sitting" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          Ask {sitterName} to look after all of your plants while you're away. They'll be able to view
          your care tasks, mark them done, and log new progress reports on your behalf.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Start date (optional)
          </Text>
          <DatePickerField value={startsAt} onChange={setStartsAt} fonts={fonts} minDate={today} maxDate={maxSittingDate} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            End date (optional)
          </Text>
          <DatePickerField
            value={endsAt}
            onChange={setEndsAt}
            fonts={fonts}
            minDate={startsAt.trim() || today}
            maxDate={maxSittingDate}
          />
          {!rangeIsValid ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
              End date must be on or after the start date
            </Text>
          ) : null}
          <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            Leave both blank for an open-ended request you can cancel anytime. Access opens at the
            start date and closes after the end date -- accepting early doesn't open it sooner.
          </Text>
        </View>

        {saveStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
        ) : null}

        <Pressable
          style={[styles.saveButton, { backgroundColor: canSave ? colors.moss : colors.line }]}
          onPress={handleSend}
          disabled={!canSave}
        >
          {saveStatus === "saving" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              Send request
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
  intro: {
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 13,
  },
  saveButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
  },
});
