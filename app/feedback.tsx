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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import { FEEDBACK_TYPES, FeedbackRateLimitedError, submitFeedback, type FeedbackType } from "../lib/supabase/feedback";
import { pickImage, uploadPhoto } from "../lib/supabase/storage";
import { ChipGroup } from "../components/ChipGroup";
import { PhotoThumb } from "../components/PhotoThumb";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

const MAX_PHOTOS = 5;
const THUMB_SIZE = 72;

export default function FeedbackScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [type, setType] = useState<FeedbackType>("suggestion");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx and app/report.tsx.
  const isSubmitting = useRef(false);

  const canSubmit = description.trim().length > 0 && submitStatus !== "submitting";

  function resetForm() {
    setType("suggestion");
    setDescription("");
    setPhotoUrls([]);
    setPhotoError(null);
    setSubmitError(null);
    setSubmitStatus("idle");
  }

  async function handleAddPhoto(source: "camera" | "library") {
    if (photoBusy || photoUrls.length >= MAX_PHOTOS) {
      return;
    }
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const picked = await pickImage(source);
      if (!picked) {
        return;
      }
      const url = await uploadPhoto({
        base64: picked.base64,
        context: "feedback",
        fileExtension: picked.fileExtension,
      });
      setPhotoUrls((prev) => [...prev, url]);
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  function handleRemovePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((existing) => existing !== url));
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;

    setSubmitStatus("submitting");
    setSubmitError(null);

    try {
      await submitFeedback({ type, description: description.trim(), photoUrls });
      setSubmitStatus("submitted");
    } catch (err) {
      setSubmitError(err instanceof FeedbackRateLimitedError ? t("feedback.rateLimitError") : getErrorMessage(err));
      setSubmitStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  if (submitStatus === "submitted") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("feedback.screenTitle") }} />
        <Text style={[styles.successText, { fontFamily: fonts.body, color: colors.ink }]}>
          {t("feedback.successMessage")}
        </Text>
        <Pressable style={[styles.saveButton, { backgroundColor: colors.moss }]} onPress={resetForm}>
          <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
            {t("feedback.submitAnotherButton")}
          </Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, { borderColor: colors.line }]} onPress={() => router.back()}>
          <Text style={[styles.secondaryButtonText, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
            {t("feedback.doneButton")}
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
      <Stack.Screen options={{ title: t("feedback.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("feedback.typeLabel")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={type}
            onChange={setType}
            options={FEEDBACK_TYPES.map((value) => ({ value, label: t(`feedback.types.${value}`) }))}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("feedback.descriptionLabel")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={description}
            onChangeText={setDescription}
            placeholder={t("feedback.descriptionPlaceholder")}
            placeholderTextColor={colors.inkSoft}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("feedback.photosLabel")}
          </Text>
          <View style={styles.photoRow}>
            {photoUrls.map((url) => (
              <View key={url} style={styles.photoThumbWrap}>
                <PhotoThumb uri={url} size={THUMB_SIZE} radius={radius.sm} />
                <Pressable
                  style={[styles.removePhotoButton, { backgroundColor: colors.coral }]}
                  onPress={() => handleRemovePhoto(url)}
                  accessibilityLabel={t("feedback.removePhoto")}
                  hitSlop={4}
                >
                  <Text style={[styles.removePhotoButtonText, { color: colors.paper }]}>×</Text>
                </Pressable>
              </View>
            ))}
            {photoBusy ? (
              <View style={[styles.photoThumbWrap, { width: THUMB_SIZE, height: THUMB_SIZE, alignItems: "center", justifyContent: "center" }]}>
                <ActivityIndicator color={colors.moss} />
              </View>
            ) : null}
          </View>
          {photoUrls.length < MAX_PHOTOS ? (
            <View style={styles.linksRow}>
              <Pressable onPress={() => handleAddPhoto("camera")} disabled={photoBusy} hitSlop={6}>
                <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  {t("photoPicker.takePhoto")}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleAddPhoto("library")} disabled={photoBusy} hitSlop={6}>
                <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  {t("photoPicker.chooseFromLibrary")}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("feedback.photoLimitHint", { max: String(MAX_PHOTOS) })}
          </Text>
          {photoError ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{photoError}</Text>
          ) : null}
        </View>

        {submitStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{submitError}</Text>
        ) : null}

        <Pressable
          style={[styles.saveButton, { backgroundColor: canSubmit ? colors.moss : colors.line }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitStatus === "submitting" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {t("feedback.submitButton")}
            </Text>
          )}
        </Pressable>
        <View style={{ height: insets.bottom }} />
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
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  photoThumbWrap: {
    position: "relative",
  },
  removePhotoButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoButtonText: {
    fontSize: 14,
    lineHeight: 16,
  },
  linksRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  link: {
    fontSize: 13,
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
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
  },
});
