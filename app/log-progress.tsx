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
import { createProgressReport, type CommentPolicy } from "../lib/supabase/plant_progress";
import { getPlant } from "../lib/supabase/plants";
import { getProfile } from "../lib/supabase/profiles";
import { supabase } from "../lib/supabase/client";
import { ChipGroup } from "../components/ChipGroup";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

export default function LogProgressScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

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
      .then(async ([plant, currentUserId]) => {
        if (cancelled || plant.owner_id === currentUserId) {
          return;
        }
        const owner = await getProfile(plant.owner_id);
        if (cancelled) {
          return;
        }
        if (owner.plant_sitter_attribution === "disabled") {
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
        comment_policy: commentPolicy,
        shared_to_feed: sharedToFeed,
      });

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
      <Stack.Screen options={{ title: "Log Progress" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Height (cm, optional)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="e.g. 32"
            placeholderTextColor={colors.inkSoft}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Notes</Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="What's new with this plant?"
            placeholderTextColor={colors.inkSoft}
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Comments</Text>
          <ChipGroup
            fonts={fonts}
            value={commentPolicy}
            onChange={setCommentPolicy}
            options={[
              { value: "public", label: "Anyone" },
              { value: "followers", label: "Followers only" },
              { value: "disabled", label: "Off" },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Feed</Text>
          {shareAllowed ? (
            <>
              <ChipGroup
                fonts={fonts}
                value={sharedToFeed ? "share" : "unlisted"}
                onChange={(value) => setSharedToFeed(value === "share")}
                options={[
                  { value: "share", label: "Share to feed" },
                  { value: "unlisted", label: "Don't share" },
                ]}
              />
              {!sharedToFeed ? (
                <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                  Won't appear in anyone's feed; it stays on this plant's own history, and its link keeps
                  working for anyone who can see the report.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              This plant's owner keeps sitter reports out of feeds -- this will only appear in the
              plant's own history.
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
              Save
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
