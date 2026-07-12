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
import { router, Stack } from "expo-router";
import { lookupPlantInfo } from "../lib/supabase/ai";
import { createPlant } from "../lib/supabase/plants";
import { createCareTask } from "../lib/supabase/care_tasks";
import { DatePickerField } from "../components/DatePickerField";
import { todayISO } from "../lib/dateGrid";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { getErrorMessage } from "../lib/errors";

export default function AddPlantScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [wateringFrequencyDays, setWateringFrequencyDays] = useState("");
  const [location, setLocation] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");

  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refs, not just state: state updates are async, so two rapid taps can
  // both read the pre-update status and both fire before either commits —
  // a ref is set synchronously and closes that race.
  const isLookingUp = useRef(false);
  const isSaving = useRef(false);

  const canSave =
    name.trim().length > 0 &&
    species.trim().length > 0 &&
    wateringFrequencyDays.trim().length > 0 &&
    Number.isFinite(Number(wateringFrequencyDays)) &&
    Number(wateringFrequencyDays) > 0 &&
    saveStatus !== "saving";

  async function handleLookup() {
    if (name.trim().length === 0 || isLookingUp.current) {
      return;
    }
    isLookingUp.current = true;

    setLookupStatus("loading");
    setLookupError(null);

    try {
      const result = await lookupPlantInfo(name.trim());
      setName(result.name);
      setSpecies(result.species);
      setWateringFrequencyDays(String(result.wateringFrequencyDays));
      setLookupStatus("idle");
    } catch (err) {
      setLookupError(getErrorMessage(err));
      setLookupStatus("error");
    } finally {
      isLookingUp.current = false;
    }
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
      });

      const frequencyDays = Number(wateringFrequencyDays);
      const nextDue = new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString();

      await createCareTask({
        plant_id: plant.id,
        type: "water",
        frequency_days: frequencyDays,
        next_due: nextDue,
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
      <Stack.Screen options={{ title: "Add Plant" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Name</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Pothos, or my new fiddle leaf fig"
            placeholderTextColor={colors.inkSoft}
          />
          <Pressable
            style={[styles.lookupButton, { backgroundColor: colors.sage }]}
            onPress={handleLookup}
            disabled={lookupStatus === "loading" || name.trim().length === 0}
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
            Nickname (optional)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. Big Fred"
            placeholderTextColor={colors.inkSoft}
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
});
