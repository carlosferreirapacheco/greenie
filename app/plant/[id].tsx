import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getPlant, updatePlantAcquiredAt, type Plant } from "../../lib/supabase/plants";
import { getCareTasksForPlants, getPlantCareStatus, type CareTask } from "../../lib/supabase/care_tasks";
import { supabase } from "../../lib/supabase/client";
import { colors, fontAssets, getFonts, radius, spacing, statusColors } from "../../lib/theme";

function careTaskLabel(type: CareTask["type"]): string {
  switch (type) {
    case "water":
      return "watering";
    case "fertilize":
      return "fertilize";
    case "repot":
      return "repot";
  }
}

export default function PlantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [careTasks, setCareTasks] = useState<CareTask[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [acquiredAtInput, setAcquiredAtInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSaving = useRef(false);

  const fetchData = useCallback(() => {
    if (!id) {
      return;
    }
    Promise.all([getPlant(id), getCareTasksForPlants([id]), supabase.auth.getUser().then(({ data }) => data.user?.id)])
      .then(([plantData, careTasksData, currentUserId]) => {
        setPlant(plantData);
        setCareTasks(careTasksData);
        setIsOwner(currentUserId === plantData.owner_id);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  function handleStartEdit() {
    setAcquiredAtInput(plant?.acquired_at ?? "");
    setSaveError(null);
    setIsEditingDate(true);
  }

  const acquiredAtIsValid =
    acquiredAtInput.trim().length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(acquiredAtInput.trim());

  async function handleSaveDate() {
    if (!id || !acquiredAtIsValid || isSaving.current) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const trimmed = acquiredAtInput.trim();
      const updated = await updatePlantAcquiredAt(id, trimmed.length > 0 ? trimmed : null);
      setPlant(updated);
      setIsEditingDate(false);
      setSaveStatus("idle");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Plant" }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error" || !plant) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Plant" }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: plant.name }} />
      <View style={[styles.thumb, { backgroundColor: colors.sage }]} />

      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>{plant.name}</Text>
      {plant.species ? (
        <Text style={[styles.species, { fontFamily: fonts.displayItalic, color: colors.inkSoft }]}>
          {plant.species}
        </Text>
      ) : null}
      {plant.location ? (
        <Text style={[styles.location, { fontFamily: fonts.body, color: colors.inkSoft }]}>{plant.location}</Text>
      ) : null}

      <View style={styles.field}>
        <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Acquired date</Text>
        {isEditingDate ? (
          <>
            <TextInput
              style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
              value={acquiredAtInput}
              onChangeText={setAcquiredAtInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkSoft}
            />
            {!acquiredAtIsValid ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                Use YYYY-MM-DD format
              </Text>
            ) : null}
            {saveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
            ) : null}
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditingDate(false)} hitSlop={8}>
                <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: acquiredAtIsValid ? colors.moss : colors.line },
                ]}
                onPress={handleSaveDate}
                disabled={!acquiredAtIsValid || saveStatus === "saving"}
              >
                {saveStatus === "saving" ? (
                  <ActivityIndicator color={colors.paper} />
                ) : (
                  <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                    Save
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.dateRow}>
            <Text style={[styles.dateValue, { fontFamily: fonts.body, color: plant.acquired_at ? colors.ink : colors.inkSoft }]}>
              {plant.acquired_at ?? "Not set"}
            </Text>
            {isOwner ? (
              <Pressable onPress={handleStartEdit} hitSlop={8}>
                <Text style={[styles.editLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {careTasks.length > 0 ? (
        <View style={styles.pillRow}>
          {careTasks
            .filter((task): task is CareTask & { next_due: string } => task.next_due !== null)
            .map((task) => {
              const taskStatus = getPlantCareStatus(task.next_due);
              const palette = statusColors[taskStatus];
              return (
                <View key={task.id} style={[styles.pill, { backgroundColor: palette.bg }]}>
                  <View style={[styles.pillDot, { backgroundColor: palette.dot }]} />
                  <Text style={[styles.pillText, { color: palette.fg, fontFamily: fonts.bodyMedium }]}>
                    {careTaskLabel(task.type)}: {taskStatus === "due_soon" ? "due soon" : taskStatus}
                  </Text>
                </View>
              );
            })}
        </View>
      ) : null}

      <Pressable
        style={[styles.logProgressButton, { backgroundColor: colors.sage }]}
        onPress={() => router.push({ pathname: "/log-progress", params: { plantId: plant.id } })}
      >
        <Text style={[styles.logProgressText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
          Log progress
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
  },
  name: {
    fontSize: 20,
  },
  species: {
    fontSize: 15,
  },
  location: {
    fontSize: 13,
  },
  field: {
    width: "100%",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: 13,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateValue: {
    fontSize: 16,
  },
  editLink: {
    fontSize: 14,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  cancelLink: {
    fontSize: 14,
  },
  saveButton: {
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
  },
  logProgressButton: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    minWidth: 160,
  },
  logProgressText: {
    fontSize: 15,
  },
});
