import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import { lookupPlantByPhoto, lookupPlantInfo } from "../lib/supabase/ai";
import { createPlant } from "../lib/supabase/plants";
import { createCareTask } from "../lib/supabase/care_tasks";
import { createProgressReport, effectiveCommentPolicy } from "../lib/supabase/plant_progress";
import { DatePickerField } from "../components/DatePickerField";
import { PhotoPicker } from "../components/PhotoPicker";
import { todayISO } from "../lib/dateGrid";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

type LookupPrompt =
  | { kind: "nameMismatch"; typedName: string; aiName: string; aiSpecies: string; aiWateringFrequencyDays: number }
  | { kind: "ambiguous"; candidateNames: string[] }
  | { kind: "notFound" };

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function AddPlantScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [wateringFrequencyDays, setWateringFrequencyDays] = useState("");
  const [location, setLocation] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [initialHeightCm, setInitialHeightCm] = useState("");

  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPrompt, setLookupPrompt] = useState<LookupPrompt | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refs, not just state: state updates are async, so two rapid taps can
  // both read the pre-update status and both fire before either commits —
  // a ref is set synchronously and closes that race.
  const isLookingUp = useRef(false);
  const isSaving = useRef(false);

  const canSave =
    photoUrl !== null &&
    name.trim().length > 0 &&
    species.trim().length > 0 &&
    wateringFrequencyDays.trim().length > 0 &&
    Number.isFinite(Number(wateringFrequencyDays)) &&
    Number(wateringFrequencyDays) > 0 &&
    saveStatus !== "saving";

  function fillFromLookup(fields: { name: string; species: string; wateringFrequencyDays: number }) {
    setName(fields.name);
    setSpecies(fields.species);
    setWateringFrequencyDays(String(fields.wateringFrequencyDays));
  }

  async function handleLookup() {
    if (photoUrl === null || isLookingUp.current) {
      return;
    }
    isLookingUp.current = true;

    setLookupStatus("loading");
    setLookupError(null);
    setLookupPrompt(null);

    try {
      const typedName = name.trim();
      const result = await lookupPlantByPhoto(photoUrl, typedName.length > 0 ? typedName : undefined);

      if (result.status === "ambiguous") {
        setLookupPrompt({ kind: "ambiguous", candidateNames: result.candidateNames });
      } else if (result.status === "not_found") {
        setLookupPrompt({ kind: "notFound" });
      } else if (typedName.length > 0 && !namesMatch(typedName, result.name)) {
        setLookupPrompt({
          kind: "nameMismatch",
          typedName,
          aiName: result.name,
          aiSpecies: result.species,
          aiWateringFrequencyDays: result.wateringFrequencyDays,
        });
      } else {
        fillFromLookup(result);
      }
      setLookupStatus("idle");
    } catch (err) {
      setLookupError(getErrorMessage(err));
      setLookupStatus("error");
    } finally {
      isLookingUp.current = false;
    }
  }

  async function handleTextLookup(query: string) {
    if (isLookingUp.current) {
      return;
    }
    isLookingUp.current = true;

    setLookupStatus("loading");
    setLookupError(null);

    try {
      const result = await lookupPlantInfo(query);
      fillFromLookup(result);
      setLookupStatus("idle");
      setLookupPrompt(null);
    } catch (err) {
      setLookupError(getErrorMessage(err));
      setLookupStatus("error");
    } finally {
      isLookingUp.current = false;
    }
  }

  function handleTakeNewPicture() {
    setPhotoUrl(null);
    setLookupPrompt(null);
  }

  function handleUseAiName() {
    if (lookupPrompt?.kind !== "nameMismatch") {
      return;
    }
    fillFromLookup({
      name: lookupPrompt.aiName,
      species: lookupPrompt.aiSpecies,
      wateringFrequencyDays: lookupPrompt.aiWateringFrequencyDays,
    });
    setLookupPrompt(null);
  }

  async function handleSave() {
    if (!canSave || isSaving.current) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const plant = await createPlant({
        name: name.trim(),
        species: species.trim(),
        location: location.trim().length > 0 ? location.trim() : null,
        acquired_at: acquiredAt.trim().length > 0 ? acquiredAt.trim() : null,
        nickname: nickname.trim().length > 0 ? nickname.trim() : null,
        photo_url: photoUrl,
      });

      const frequencyDays = Number(wateringFrequencyDays);
      const nextDue = new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString();

      await createCareTask({
        plant_id: plant.id,
        type: "water",
        frequency_days: frequencyDays,
        next_due: nextDue,
      });

      const trimmedInitialHeight = initialHeightCm.trim();
      if (trimmedInitialHeight.length > 0) {
        await createProgressReport({
          plant_id: plant.id,
          height_cm: Number(trimmedInitialHeight),
          notes: "",
          comment_policy: effectiveCommentPolicy(false, "public"),
          shared_to_feed: false,
          photo_url: null,
        });
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
      <Stack.Screen options={{ title: "Add Plant" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Photo</Text>
          <PhotoPicker value={photoUrl} onChange={setPhotoUrl} context="plants" fonts={fonts} />
          <Pressable
            style={[styles.lookupButton, { backgroundColor: colors.sage }]}
            onPress={handleLookup}
            disabled={lookupStatus === "loading" || photoUrl === null}
          >
            {lookupStatus === "loading" ? (
              <ActivityIndicator color={colors.mossStrong} />
            ) : (
              <Text style={[styles.lookupButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                Look up with AI
              </Text>
            )}
          </Pressable>
          {lookupStatus === "error" ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{lookupError}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Name (optional)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Pothos -- leave blank to let AI name it from the photo"
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Nickname (optional)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Species</Text>
          <TextInput
            style={[
              styles.input,
              { fontFamily: fonts.displayItalic, color: colors.ink, borderColor: colors.line },
            ]}
            value={species}
            onChangeText={setSpecies}
            placeholder="e.g. Epipremnum aureum"
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Watering frequency (days)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={wateringFrequencyDays}
            onChangeText={setWateringFrequencyDays}
            placeholder="e.g. 8"
            placeholderTextColor={colors.inkSoft}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Location (optional)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Living room, east window"
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Acquired date (optional)
          </Text>
          <DatePickerField value={acquiredAt} onChange={setAcquiredAt} fonts={fonts} maxDate={todayISO()} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Initial height (cm, optional)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={initialHeightCm}
            onChangeText={setInitialHeightCm}
            placeholder="e.g. 32"
            placeholderTextColor={colors.inkSoft}
            keyboardType="decimal-pad"
          />
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
              Save plant
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Conditionally rendered (not just visible={isOpen}) -- Modal's
          visible prop alone doesn't reliably unmount content on web,
          same pattern as components/DatePickerField.tsx. */}
      {lookupPrompt ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLookupPrompt(null)}>
          <Pressable style={styles.backdrop} onPress={() => setLookupPrompt(null)}>
            {/* Empty onPress swallows the touch so it doesn't bubble to the backdrop's close handler. */}
            <Pressable style={[styles.card, { backgroundColor: colors.paperRaised }]} onPress={() => {}}>
              {lookupPrompt.kind === "nameMismatch" ? (
                <>
                  <Text style={[styles.promptText, { fontFamily: fonts.body, color: colors.ink }]}>
                    AI identified this as &quot;{lookupPrompt.aiName}&quot;, but you entered &quot;
                    {lookupPrompt.typedName}&quot;.
                  </Text>
                  <Pressable
                    style={[styles.promptButton, { backgroundColor: colors.sage }]}
                    onPress={() => handleTextLookup(lookupPrompt.typedName)}
                    disabled={lookupStatus === "loading"}
                  >
                    <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                      Keep &quot;{lookupPrompt.typedName}&quot;
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.promptButton, { backgroundColor: colors.sage }]}
                    onPress={handleUseAiName}
                    disabled={lookupStatus === "loading"}
                  >
                    <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                      Use &quot;{lookupPrompt.aiName}&quot;
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {lookupPrompt.kind === "ambiguous" ? (
                <>
                  <Text style={[styles.promptText, { fontFamily: fonts.body, color: colors.ink }]}>
                    Found more than one possible match:
                  </Text>
                  {lookupPrompt.candidateNames.map((candidate) => (
                    <Pressable
                      key={candidate}
                      style={[styles.promptButton, { backgroundColor: colors.sage }]}
                      onPress={() => handleTextLookup(candidate)}
                      disabled={lookupStatus === "loading"}
                    >
                      <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                        {candidate}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable style={styles.promptSecondaryButton} onPress={handleTakeNewPicture}>
                    <Text style={[styles.promptSecondaryText, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                      Take a new picture
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {lookupPrompt.kind === "notFound" ? (
                <>
                  <Text style={[styles.promptText, { fontFamily: fonts.body, color: colors.ink }]}>
                    Couldn&apos;t identify a plant in that photo. Take a new picture, or close this, type a common
                    name above, and try again.
                  </Text>
                  <Pressable style={[styles.promptButton, { backgroundColor: colors.sage }]} onPress={handleTakeNewPicture}>
                    <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                      Take a new picture
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {lookupStatus === "loading" ? (
                <View style={styles.promptLoading}>
                  <ActivityIndicator color={colors.moss} />
                </View>
              ) : null}
              {lookupStatus === "error" && lookupError ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{lookupError}</Text>
              ) : null}

              <Pressable style={styles.promptSecondaryButton} onPress={() => setLookupPrompt(null)}>
                <Text style={[styles.promptSecondaryText, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  Cancel
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
  },
  lookupButton: {
    marginTop: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  lookupButtonText: {
    fontSize: 14,
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
});
