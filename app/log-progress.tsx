import { useEffect, useRef, useState } from "react";
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
import { createProgressReport, effectiveCommentPolicy, type CommentPolicy } from "../lib/supabase/plant_progress";
import { getPlant, updatePlantPhoto, type Plant } from "../lib/supabase/plants";
import { getProfile } from "../lib/supabase/profiles";
import { deletePhotoByUrl } from "../lib/supabase/storage";
import { supabase } from "../lib/supabase/client";
import { ChipGroup } from "../components/ChipGroup";
import { PhotoPicker } from "../components/PhotoPicker";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

export default function LogProgressScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [setAsPlantPhoto, setSetAsPlantPhoto] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [notes, setNotes] = useState("");
  const [commentPolicy, setCommentPolicy] = useState<CommentPolicy>("public");
  const [sharedToFeed, setSharedToFeed] = useState(true);
  // Whether this plant's owner (relevant only when logging as a
  // sitter) allows sharing to a feed at all -- see
  // can_share_progress_to_feed() RLS. Defaults true so the form isn't
  // blocked while this resolves; RLS is the real backstop either way.
  const [shareAllowed, setShareAllowed] = useState(true);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx and app/profile.tsx.
  const isSaving = useRef(false);

  useEffect(() => {
    if (!plantId) {
      return;
    }
    let cancelled = false;

    Promise.all([getPlant(plantId), supabase.auth.getUser().then(({ data }) => data.user?.id)])
      .then(async ([plantData, currentUserId]) => {
        if (cancelled) {
          return;
        }
        setPlant(plantData);
        const owner = plantData.owner_id === currentUserId;
        setIsOwner(owner);
        if (owner) {
          return;
        }
        const ownerProfile = await getProfile(plantData.owner_id);
        if (cancelled) {
          return;
        }
        if (ownerProfile.plant_sitter_attribution === "disabled") {
          setShareAllowed(false);
          setSharedToFeed(false);
        }
      })
      .catch(() => {
        // Non-critical -- if this fails, the form stays as if sharing
        // is allowed and RLS rejects an actual disallowed save.
      });

    return () => {
      cancelled = true;
    };
  }, [plantId]);

  const canSave = notes.trim().length > 0 && saveStatus !== "saving";

  async function handleSave() {
    if (!canSave || isSaving.current || !plantId) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const trimmedHeight = heightCm.trim();
      await createProgressReport({
        plant_id: plantId,
        height_cm: trimmedHeight.length > 0 ? Number(trimmedHeight) : null,
        notes: notes.trim(),
        comment_policy: effectiveCommentPolicy(sharedToFeed, commentPolicy),
        shared_to_feed: sharedToFeed,
        photo_url: photoUrl,
      });

      if (setAsPlantPhoto && isOwner && photoUrl) {
        try {
          const previousPhotoUrl = plant?.photo_urls?.[0] ?? null;
          await updatePlantPhoto(plantId, photoUrl);
          if (previousPhotoUrl) {
            await deletePhotoByUrl(previousPhotoUrl);
          }
        } catch {
          // Non-critical -- the report itself saved fine; the owner can
          // still set the plant's photo manually from its profile.
        }
      }

      router.back();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: t("logProgress.headerTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("logProgress.photo.label")}
          </Text>
          <PhotoPicker value={photoUrl} onChange={setPhotoUrl} context="progress" fonts={fonts} />
          {isOwner && photoUrl ? (
            <ChipGroup
              fonts={fonts}
              value={setAsPlantPhoto ? "yes" : "no"}
              onChange={(value) => setSetAsPlantPhoto(value === "yes")}
              options={[
                { value: "no", label: t("logProgress.photo.chipJustReport") },
                { value: "yes", label: t("logProgress.photo.chipAlsoSetPlantPhoto") },
              ]}
            />
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("logProgress.height.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder={t("addPlant.initialHeight.placeholder")}
            placeholderTextColor={colors.inkSoft}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("logProgress.notes.label")}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("logProgress.notes.placeholder")}
            placeholderTextColor={colors.inkSoft}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("logProgress.comments.label")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={commentPolicy}
            onChange={setCommentPolicy}
            disabled={!sharedToFeed}
            options={[
              { value: "public", label: t("common.chipOptions.commentPolicy.anyone") },
              { value: "followers", label: t("common.chipOptions.commentPolicy.followersOnly") },
              { value: "disabled", label: t("common.chipOptions.commentPolicy.off") },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("logProgress.feed.label")}
          </Text>
          {shareAllowed ? (
            <>
              <ChipGroup
                fonts={fonts}
                value={sharedToFeed ? "share" : "unlisted"}
                onChange={(value) => {
                  const nextShared = value === "share";
                  setSharedToFeed(nextShared);
                  if (!nextShared) {
                    setCommentPolicy("disabled");
                  }
                }}
                options={[
                  { value: "share", label: t("common.chipOptions.feedSharing.shareToFeed") },
                  { value: "unlisted", label: t("common.chipOptions.feedSharing.dontShare") },
                ]}
              />
              {!sharedToFeed ? (
                <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                  {t("logProgress.feed.unlistedWarning")}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              {t("logProgress.feed.sitterShareBlockedHint")}
            </Text>
          )}
        </View>

        {saveStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
        ) : null}

        <Pressable
          style={[styles.saveButton, { backgroundColor: canSave ? colors.moss : colors.line }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saveStatus === "saving" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {t("common.save")}
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
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
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
