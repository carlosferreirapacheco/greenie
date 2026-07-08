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
import {
  createCareTask,
  deleteCareTask,
  getCareTasksForPlants,
  getPlantCareStatus,
  markCareTaskDone,
  updateCareTaskFrequency,
  type CareTask,
  type CareTaskType,
} from "../../lib/supabase/care_tasks";
import { supabase } from "../../lib/supabase/client";
import { colors, fontAssets, getFonts, radius, spacing, statusColors } from "../../lib/theme";

const ALL_TASK_TYPES: CareTaskType[] = ["water", "fertilize", "repot"];

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

function formatDate(iso: string | null): string {
  if (!iso) {
    return "Never";
  }
  return new Date(iso).toISOString().slice(0, 10);
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

  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const busyTaskRef = useRef<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFrequencyInput, setEditFrequencyInput] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskType, setNewTaskType] = useState<CareTaskType | null>(null);
  const [newTaskFrequency, setNewTaskFrequency] = useState("");

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

  async function handleMarkDone(task: CareTask) {
    if (busyTaskRef.current) {
      return;
    }
    busyTaskRef.current = task.id;
    setBusyTaskId(task.id);
    setTasksError(null);

    try {
      const updated = await markCareTaskDone(task);
      setCareTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : String(err));
    } finally {
      busyTaskRef.current = null;
      setBusyTaskId(null);
    }
  }

  function handleStartEditFrequency(task: CareTask) {
    setEditingTaskId(task.id);
    setEditFrequencyInput(String(task.frequency_days));
    setConfirmDeleteId(null);
    setTasksError(null);
  }

  const editFrequencyIsValid =
    Number.isFinite(Number(editFrequencyInput)) && Number(editFrequencyInput) > 0;

  async function handleSaveFrequency(task: CareTask) {
    if (!editFrequencyIsValid || busyTaskRef.current) {
      return;
    }
    busyTaskRef.current = task.id;
    setBusyTaskId(task.id);
    setTasksError(null);

    try {
      const updated = await updateCareTaskFrequency(task.id, Number(editFrequencyInput));
      setCareTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTaskId(null);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : String(err));
    } finally {
      busyTaskRef.current = null;
      setBusyTaskId(null);
    }
  }

  async function handleConfirmDelete(task: CareTask) {
    if (busyTaskRef.current) {
      return;
    }
    busyTaskRef.current = task.id;
    setBusyTaskId(task.id);
    setTasksError(null);

    try {
      await deleteCareTask(task.id);
      setCareTasks((prev) => prev.filter((t) => t.id !== task.id));
      setConfirmDeleteId(null);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : String(err));
    } finally {
      busyTaskRef.current = null;
      setBusyTaskId(null);
    }
  }

  function handleStartAddTask() {
    setIsAddingTask(true);
    setNewTaskType(null);
    setNewTaskFrequency("");
    setTasksError(null);
  }

  const newTaskFrequencyIsValid =
    Number.isFinite(Number(newTaskFrequency)) && Number(newTaskFrequency) > 0;

  async function handleSaveNewTask() {
    if (!id || !newTaskType || !newTaskFrequencyIsValid || busyTaskRef.current) {
      return;
    }
    busyTaskRef.current = "new";
    setBusyTaskId("new");
    setTasksError(null);

    try {
      const frequencyDays = Number(newTaskFrequency);
      const nextDue = new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString();
      const created = await createCareTask({
        plant_id: id,
        type: newTaskType,
        frequency_days: frequencyDays,
        next_due: nextDue,
      });
      setCareTasks((prev) => [...prev, created]);
      setIsAddingTask(false);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : String(err));
    } finally {
      busyTaskRef.current = null;
      setBusyTaskId(null);
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

      {isOwner ? (
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Care tasks</Text>

          {tasksError ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{tasksError}</Text>
          ) : null}

          {careTasks.map((task) => {
            const isBusy = busyTaskId === task.id;
            return (
              <View key={task.id} style={[styles.taskRow, { borderColor: colors.line }]}>
                <View style={styles.taskRowMain}>
                  <Text style={[styles.taskType, { fontFamily: fonts.bodySemiBold, color: colors.ink }]}>
                    {careTaskLabel(task.type)}
                  </Text>
                  <Text style={[styles.taskMeta, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                    Every {task.frequency_days} day{task.frequency_days === 1 ? "" : "s"} · Last done:{" "}
                    {formatDate(task.last_done)} · Next due: {formatDate(task.next_due)}
                  </Text>
                </View>

                {editingTaskId === task.id ? (
                  <View style={styles.taskEditRow}>
                    <TextInput
                      style={[styles.taskFrequencyInput, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                      value={editFrequencyInput}
                      onChangeText={setEditFrequencyInput}
                      keyboardType="number-pad"
                      placeholder="days"
                      placeholderTextColor={colors.inkSoft}
                    />
                    <Pressable onPress={() => setEditingTaskId(null)} hitSlop={8}>
                      <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleSaveFrequency(task)} hitSlop={8} disabled={!editFrequencyIsValid || isBusy}>
                      <Text
                        style={[
                          styles.taskActionLink,
                          { fontFamily: fonts.bodyMedium, color: editFrequencyIsValid ? colors.moss : colors.inkSoft },
                        ]}
                      >
                        Save
                      </Text>
                    </Pressable>
                  </View>
                ) : confirmDeleteId === task.id ? (
                  <View style={styles.taskEditRow}>
                    <Text style={[styles.taskMeta, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                      Delete this task?
                    </Text>
                    <Pressable onPress={() => setConfirmDeleteId(null)} hitSlop={8}>
                      <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleConfirmDelete(task)} hitSlop={8} disabled={isBusy}>
                      <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                        Confirm
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.taskActionsRow}>
                    <Pressable onPress={() => handleMarkDone(task)} hitSlop={8} disabled={isBusy}>
                      {isBusy ? (
                        <ActivityIndicator color={colors.moss} />
                      ) : (
                        <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                          Mark done
                        </Text>
                      )}
                    </Pressable>
                    <Pressable onPress={() => handleStartEditFrequency(task)} hitSlop={8} disabled={isBusy}>
                      <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmDeleteId(task.id)} hitSlop={8} disabled={isBusy}>
                      <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {isAddingTask ? (
            <View style={[styles.taskRow, { borderColor: colors.line }]}>
              <View style={styles.taskTypeRow}>
                {ALL_TASK_TYPES.filter((t) => !careTasks.some((task) => task.type === t)).map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.taskTypeChoice,
                      { borderColor: colors.line, backgroundColor: newTaskType === t ? colors.sage : "transparent" },
                    ]}
                    onPress={() => setNewTaskType(t)}
                  >
                    <Text style={[styles.taskMeta, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                      {careTaskLabel(t)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.taskEditRow}>
                <TextInput
                  style={[styles.taskFrequencyInput, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                  value={newTaskFrequency}
                  onChangeText={setNewTaskFrequency}
                  keyboardType="number-pad"
                  placeholder="days"
                  placeholderTextColor={colors.inkSoft}
                />
                <Pressable onPress={() => setIsAddingTask(false)} hitSlop={8}>
                  <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveNewTask}
                  hitSlop={8}
                  disabled={!newTaskType || !newTaskFrequencyIsValid || busyTaskId === "new"}
                >
                  {busyTaskId === "new" ? (
                    <ActivityIndicator color={colors.moss} />
                  ) : (
                    <Text
                      style={[
                        styles.taskActionLink,
                        {
                          fontFamily: fonts.bodyMedium,
                          color: newTaskType && newTaskFrequencyIsValid ? colors.moss : colors.inkSoft,
                        },
                      ]}
                    >
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : ALL_TASK_TYPES.some((t) => !careTasks.some((task) => task.type === t)) ? (
            <Pressable onPress={handleStartAddTask} hitSlop={8} style={styles.addTaskLink}>
              <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                + Add task
              </Text>
            </Pressable>
          ) : null}
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
  taskRow: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 6,
  },
  taskRowMain: {
    gap: 2,
  },
  taskType: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  taskMeta: {
    fontSize: 12,
  },
  taskActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  taskActionLink: {
    fontSize: 13,
  },
  taskEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  taskFrequencyInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    width: 70,
  },
  taskTypeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  taskTypeChoice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  addTaskLink: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
});
