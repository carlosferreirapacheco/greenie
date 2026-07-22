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
import {
  lookupPlantByPhoto,
  lookupPlantInfo,
  type CareDifficulty,
  type LightExposure,
  type ToxicityAnswer,
} from "../lib/supabase/ai";
import { createPlant } from "../lib/supabase/plants";
import { createCareTask } from "../lib/supabase/care_tasks";
import { createProgressReport, effectiveCommentPolicy } from "../lib/supabase/plant_progress";
import { DatePickerField } from "../components/DatePickerField";
import { PhotoPicker } from "../components/PhotoPicker";
import { ChipGroup } from "../components/ChipGroup";
import { todayISO } from "../lib/dateGrid";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

type LookedUpFields = {
  name: string;
  species: string;
  wateringFrequencyDays: number;
  fertilizeFrequencyDays: number;
  repotFrequencyDays: number;
  lightExposure: LightExposure | "unknown";
  careDifficulty: CareDifficulty | "unknown";
  toxicToPets: ToxicityAnswer;
  toxicToHumans: ToxicityAnswer;
};

type LookupPrompt =
  | {
      kind: "nameMismatch";
      typedName: string;
      aiName: string;
      aiSpecies: string;
      aiWateringFrequencyDays: number;
      aiFertilizeFrequencyDays: number;
      aiRepotFrequencyDays: number;
      aiLightExposure: LightExposure | "unknown";
      aiCareDifficulty: CareDifficulty | "unknown";
      aiToxicToPets: ToxicityAnswer;
      aiToxicToHumans: ToxicityAnswer;
    }
  | { kind: "ambiguous"; candidateNames: string[] }
  | { kind: "notFound" };

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function AddPlantScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t, locale } = useLanguage();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [wateringFrequencyDays, setWateringFrequencyDays] = useState("");
  const [fertilizeFrequencyDays, setFertilizeFrequencyDays] = useState("");
  const [repotFrequencyDays, setRepotFrequencyDays] = useState("");
  const [lightExposure, setLightExposure] = useState<LightExposure | "">("");
  const [location, setLocation] = useState("");
  const [careDifficulty, setCareDifficulty] = useState<CareDifficulty | "">("");
  const [toxicToPets, setToxicToPets] = useState<ToxicityAnswer | "">("");
  const [toxicToHumans, setToxicToHumans] = useState<ToxicityAnswer | "">("");
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

  function fillFromLookup(fields: LookedUpFields) {
    setName(fields.name);
    setSpecies(fields.species);
    setWateringFrequencyDays(String(fields.wateringFrequencyDays));
    setFertilizeFrequencyDays(String(fields.fertilizeFrequencyDays));
    setRepotFrequencyDays(String(fields.repotFrequencyDays));
    setLightExposure(fields.lightExposure === "unknown" ? "" : fields.lightExposure);
    setCareDifficulty(fields.careDifficulty === "unknown" ? "" : fields.careDifficulty);
    setToxicToPets(fields.toxicToPets);
    setToxicToHumans(fields.toxicToHumans);
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
      const result = await lookupPlantByPhoto(photoUrl, typedName.length > 0 ? typedName : undefined, locale);

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
          aiFertilizeFrequencyDays: result.fertilizeFrequencyDays,
          aiRepotFrequencyDays: result.repotFrequencyDays,
          aiLightExposure: result.lightExposure,
          aiCareDifficulty: result.careDifficulty,
          aiToxicToPets: result.toxicToPets,
          aiToxicToHumans: result.toxicToHumans,
        });
      } else {
        fillFromLookup(result);
      }
      setLookupStatus("idle");
    } catch {
      // The specific cause is durably logged server-side (see
      // ai_lookup_error_logs) -- the UI always shows one generic,
      // translated message regardless of what actually failed.
      setLookupError(t("addPlant.lookupError"));
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
      const result = await lookupPlantInfo(query, locale);
      fillFromLookup(result);
      setLookupStatus("idle");
      setLookupPrompt(null);
    } catch {
      // Same reasoning as handlePhotoLookup's catch above.
      setLookupError(t("addPlant.lookupError"));
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
      fertilizeFrequencyDays: lookupPrompt.aiFertilizeFrequencyDays,
      repotFrequencyDays: lookupPrompt.aiRepotFrequencyDays,
      lightExposure: lookupPrompt.aiLightExposure,
      careDifficulty: lookupPrompt.aiCareDifficulty,
      toxicToPets: lookupPrompt.aiToxicToPets,
      toxicToHumans: lookupPrompt.aiToxicToHumans,
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
        light_exposure: lightExposure || null,
        care_difficulty: careDifficulty || null,
        toxic_to_pets: toxicToPets || null,
        toxic_to_humans: toxicToHumans || null,
      });

      const frequencyDays = Number(wateringFrequencyDays);
      const nextDue = new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString();

      await createCareTask({
        plant_id: plant.id,
        type: "water",
        frequency_days: frequencyDays,
        next_due: nextDue,
      });

      // Both optional -- only created when the field holds a valid
      // positive number, whether that came from the AI lookup or the
      // user typed it in themselves. Skipped otherwise; the existing
      // "+ Add task" flow on the plant screen still covers adding them
      // later.
      const trimmedFertilize = fertilizeFrequencyDays.trim();
      if (trimmedFertilize.length > 0 && Number.isFinite(Number(trimmedFertilize)) && Number(trimmedFertilize) > 0) {
        const days = Number(trimmedFertilize);
        await createCareTask({
          plant_id: plant.id,
          type: "fertilize",
          frequency_days: days,
          next_due: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const trimmedRepot = repotFrequencyDays.trim();
      if (trimmedRepot.length > 0 && Number.isFinite(Number(trimmedRepot)) && Number(trimmedRepot) > 0) {
        const days = Number(trimmedRepot);
        await createCareTask({
          plant_id: plant.id,
          type: "repot",
          frequency_days: days,
          next_due: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

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
      <Stack.Screen options={{ title: t("addPlant.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.photo.label")}
          </Text>
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
                {t("addPlant.photo.lookupButton")}
              </Text>
            )}
          </Pressable>
          {lookupStatus === "error" ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{lookupError}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.name.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={name}
            onChangeText={setName}
            placeholder={t("addPlant.name.placeholder")}
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.nickname.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.species.label")}
          </Text>
          <TextInput
            style={[
              styles.input,
              { fontFamily: fonts.displayItalic, color: colors.ink, borderColor: colors.line },
            ]}
            value={species}
            onChangeText={setSpecies}
            placeholder={t("addPlant.species.placeholder")}
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.wateringFrequency.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={wateringFrequencyDays}
            onChangeText={setWateringFrequencyDays}
            placeholder={t("addPlant.wateringFrequency.placeholder")}
            placeholderTextColor={colors.inkSoft}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.fertilizeFrequency.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={fertilizeFrequencyDays}
            onChangeText={setFertilizeFrequencyDays}
            placeholder={t("addPlant.fertilizeFrequency.placeholder")}
            placeholderTextColor={colors.inkSoft}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.repotFrequency.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={repotFrequencyDays}
            onChangeText={setRepotFrequencyDays}
            placeholder={t("addPlant.repotFrequency.placeholder")}
            placeholderTextColor={colors.inkSoft}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.location.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={location}
            onChangeText={setLocation}
            placeholder={t("addPlant.location.placeholder")}
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.lightExposure.label")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={lightExposure}
            onChange={setLightExposure}
            options={[
              { value: "low_light", label: t("addPlant.lightExposure.options.lowLight") },
              { value: "medium_light", label: t("addPlant.lightExposure.options.mediumLight") },
              { value: "bright_indirect", label: t("addPlant.lightExposure.options.brightIndirect") },
              { value: "direct_sun", label: t("addPlant.lightExposure.options.directSun") },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.careDifficulty.label")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={careDifficulty}
            onChange={setCareDifficulty}
            options={[
              { value: "beginner", label: t("addPlant.careDifficulty.options.beginner") },
              { value: "intermediate", label: t("addPlant.careDifficulty.options.intermediate") },
              { value: "advanced", label: t("addPlant.careDifficulty.options.advanced") },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.toxicToPets.label")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={toxicToPets}
            onChange={setToxicToPets}
            options={[
              { value: "yes", label: t("addPlant.toxicity.options.yes") },
              { value: "no", label: t("addPlant.toxicity.options.no") },
              { value: "unknown", label: t("addPlant.toxicity.options.unknown") },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.toxicToHumans.label")}
          </Text>
          <ChipGroup
            fonts={fonts}
            value={toxicToHumans}
            onChange={setToxicToHumans}
            options={[
              { value: "yes", label: t("addPlant.toxicity.options.yes") },
              { value: "no", label: t("addPlant.toxicity.options.no") },
              { value: "unknown", label: t("addPlant.toxicity.options.unknown") },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.acquiredDate.label")}
          </Text>
          <DatePickerField value={acquiredAt} onChange={setAcquiredAt} fonts={fonts} maxDate={todayISO()} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("addPlant.initialHeight.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={initialHeightCm}
            onChangeText={setInitialHeightCm}
            placeholder={t("addPlant.initialHeight.placeholder")}
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
              {t("addPlant.saveButton")}
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
                    {t("addPlant.lookupModal.nameMismatch.message", {
                      aiName: lookupPrompt.aiName,
                      typedName: lookupPrompt.typedName,
                    })}
                  </Text>
                  <Pressable
                    style={[styles.promptButton, { backgroundColor: colors.sage }]}
                    onPress={() => handleTextLookup(lookupPrompt.typedName)}
                    disabled={lookupStatus === "loading"}
                  >
                    <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                      {t("addPlant.lookupModal.nameMismatch.keepTyped", { typedName: lookupPrompt.typedName })}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.promptButton, { backgroundColor: colors.sage }]}
                    onPress={handleUseAiName}
                    disabled={lookupStatus === "loading"}
                  >
                    <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                      {t("addPlant.lookupModal.nameMismatch.useAi", { aiName: lookupPrompt.aiName })}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {lookupPrompt.kind === "ambiguous" ? (
                <>
                  <Text style={[styles.promptText, { fontFamily: fonts.body, color: colors.ink }]}>
                    {t("addPlant.lookupModal.ambiguous.message")}
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
                      {t("addPlant.lookupModal.takeNewPicture")}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {lookupPrompt.kind === "notFound" ? (
                <>
                  <Text style={[styles.promptText, { fontFamily: fonts.body, color: colors.ink }]}>
                    {t("addPlant.lookupModal.notFound.message")}
                  </Text>
                  <Pressable style={[styles.promptButton, { backgroundColor: colors.sage }]} onPress={handleTakeNewPicture}>
                    <Text style={[styles.promptButtonText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                      {t("addPlant.lookupModal.takeNewPicture")}
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
                  {t("addPlant.lookupModal.cancel")}
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
