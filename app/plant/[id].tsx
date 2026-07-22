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
import {
  archivePlant,
  getMyPlants,
  getPlant,
  plantCommonNameSubtitle,
  plantPrimaryName,
  updatePlantAcquiredAt,
  updatePlantNickname,
  updatePlantPhoto,
  type Plant,
} from "../../lib/supabase/plants";
import { getProgressReportsForPlant, type ProgressReport } from "../../lib/supabase/plant_progress";
import { getMyActiveAssignmentOwnerIds } from "../../lib/supabase/plant_sitting";
import { deletePhotoByUrl } from "../../lib/supabase/storage";
import { HeightChart } from "../../components/HeightChart";
import { DatePickerField } from "../../components/DatePickerField";
import { PhotoPicker } from "../../components/PhotoPicker";
import { PhotoThumb } from "../../components/PhotoThumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import { todayISO } from "../../lib/dateGrid";
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
import { dismissStaleCareDueNotifications } from "../../lib/pushNotificationManager";
import { fontAssets, getFonts, getStatusColors, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { getErrorMessage } from "../../lib/errors";
import { formatDisplayDate } from "../../lib/dateFormat";

const ALL_TASK_TYPES: CareTaskType[] = ["water", "fertilize", "repot"];

function careTaskLabel(type: CareTask["type"], t: (key: string) => string): string {
  switch (type) {
    case "water":
      return t("index.careType.watering");
    case "fertilize":
      return t("index.careType.fertilize");
    case "repot":
      return t("index.careType.repot");
  }
}

function statusText(status: "healthy" | "due_soon" | "overdue", t: (key: string) => string): string {
  return t(status === "due_soon" ? "index.status.dueSoon" : `index.status.${status}`);
}

function formatTaskDate(iso: string | null, t: (key: string) => string): string {
  return iso ? formatDisplayDate(iso) : t("plantDetail.neverDoneDate");
}

export default function PlantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const statusColors = getStatusColors(colors);
  const { t } = useLanguage();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [careTasks, setCareTasks] = useState<CareTask[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isSitting, setIsSitting] = useState(false);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [acquiredAtInput, setAcquiredAtInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSaving = useRef(false);

  const [photoSaveError, setPhotoSaveError] = useState<string | null>(null);

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaveStatus, setNicknameSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [nicknameSaveError, setNicknameSaveError] = useState<string | null>(null);
  const isSavingNickname = useRef(false);

  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const busyTaskRef = useRef<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFrequencyInput, setEditFrequencyInput] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [markDonePromptId, setMarkDonePromptId] = useState<string | null>(null);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskType, setNewTaskType] = useState<CareTaskType | null>(null);
  const [newTaskFrequency, setNewTaskFrequency] = useState("");

  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<"idle" | "archiving" | "error">("idle");
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const isArchiving = useRef(false);

  const fetchData = useCallback(() => {
    if (!id) {
      return;
    }
    Promise.all([
      getPlant(id),
      getCareTasksForPlants([id]),
      getProgressReportsForPlant(id),
      supabase.auth.getUser().then(({ data }) => data.user?.id),
      getMyActiveAssignmentOwnerIds().catch(() => [] as string[]),
    ])
      .then(([plantData, careTasksData, progressReportsData, currentUserId, activeOwnerIds]) => {
        setPlant(plantData);
        setCareTasks(careTasksData);
        setProgressReports(progressReportsData);
        setIsOwner(currentUserId === plantData.owner_id);
        setIsSitting(activeOwnerIds.includes(plantData.owner_id));
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
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

  function handleCancelArchiveConfirm() {
    setConfirmingArchive(false);
    setArchiveStatus("idle");
    setArchiveError(null);
  }

  async function handleArchive() {
    if (!id || isArchiving.current) {
      return;
    }
    isArchiving.current = true;

    setArchiveStatus("archiving");
    setArchiveError(null);

    try {
      const updated = await archivePlant(id);
      setPlant(updated);
      setConfirmingArchive(false);
      setArchiveStatus("idle");
      // Clears any already-delivered care_due tray notification for
      // this plant now that it's paused. Best-effort, fire-and-forget.
      getMyPlants()
        .then((plants) => dismissStaleCareDueNotifications(plants.map((p) => p.id)))
        .catch(() => {});
    } catch (err) {
      // Leaves confirmingArchive set -- the modal stays open with the
      // error shown inline instead of silently vanishing.
      setArchiveError(getErrorMessage(err));
      setArchiveStatus("error");
    } finally {
      isArchiving.current = false;
    }
  }

  async function handleSaveDate() {
    if (!id || isSaving.current) {
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
      setSaveError(getErrorMessage(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  async function handlePhotoChange(url: string) {
    if (!id) {
      return;
    }
    const previousUrl = plant?.photo_urls?.[0] ?? null;
    setPhotoSaveError(null);

    try {
      const updated = await updatePlantPhoto(id, url);
      setPlant(updated);
      if (previousUrl) {
        await deletePhotoByUrl(previousUrl);
      }
    } catch (err) {
      setPhotoSaveError(getErrorMessage(err));
    }
  }

  function handleStartEditNickname() {
    setNicknameInput(plant?.nickname ?? "");
    setNicknameSaveError(null);
    setIsEditingNickname(true);
  }

  async function handleSaveNickname() {
    if (!id || isSavingNickname.current) {
      return;
    }
    isSavingNickname.current = true;

    setNicknameSaveStatus("saving");
    setNicknameSaveError(null);

    try {
      const trimmed = nicknameInput.trim();
      const updated = await updatePlantNickname(id, trimmed.length > 0 ? trimmed : null);
      setPlant(updated);
      setIsEditingNickname(false);
      setNicknameSaveStatus("idle");
    } catch (err) {
      setNicknameSaveError(err instanceof Error ? err.message : String(err));
      setNicknameSaveStatus("error");
    } finally {
      isSavingNickname.current = false;
    }
  }

  async function executeMarkDone(task: CareTask, nextDueAnchor?: Date) {
    if (busyTaskRef.current) {
      return;
    }
    busyTaskRef.current = task.id;
    setBusyTaskId(task.id);
    setTasksError(null);

    try {
      const updated = await markCareTaskDone(task, nextDueAnchor);
      setCareTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMarkDonePromptId(null);
    } catch (err) {
      setTasksError(getErrorMessage(err));
    } finally {
      busyTaskRef.current = null;
      setBusyTaskId(null);
    }
  }

  function handleMarkDonePress(task: CareTask) {
    const isOverdue = task.next_due !== null && new Date(task.next_due).getTime() < Date.now();
    if (isOverdue) {
      setMarkDonePromptId(task.id);
      setEditingTaskId(null);
      setConfirmDeleteId(null);
      setTasksError(null);
      return;
    }
    executeMarkDone(task);
  }

  function handleStartEditFrequency(task: CareTask) {
    setEditingTaskId(task.id);
    setEditFrequencyInput(String(task.frequency_days));
    setConfirmDeleteId(null);
    setMarkDonePromptId(null);
    setTasksError(null);
  }

  function handleStartDelete(task: CareTask) {
    setConfirmDeleteId(task.id);
    setEditingTaskId(null);
    setMarkDonePromptId(null);
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
      setTasksError(getErrorMessage(err));
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
      setTasksError(getErrorMessage(err));
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
      setTasksError(getErrorMessage(err));
    } finally {
      busyTaskRef.current = null;
      setBusyTaskId(null);
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("plantDetail.headerTitle") }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error" || !plant) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("plantDetail.headerTitle") }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>
          {t("plantDetail.errorPrefix", { error: error ?? "" })}
        </Text>
      </View>
    );
  }

  const pendingDeleteTask = confirmDeleteId ? careTasks.find((task) => task.id === confirmDeleteId) ?? null : null;
  const pendingMarkDoneTask = markDonePromptId ? careTasks.find((task) => task.id === markDonePromptId) ?? null : null;

  return (
    <>
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: plantPrimaryName(plant) }} />
      {isOwner ? (
        <PhotoPicker
          value={plant.photo_urls?.[0] ?? null}
          onChange={handlePhotoChange}
          context="plants"
          size={88}
          photoRadius={radius.lg}
          fonts={fonts}
        />
      ) : (
        <PhotoThumb uri={plant.photo_urls?.[0] ?? null} size={88} radius={radius.lg} />
      )}
      {photoSaveError ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{photoSaveError}</Text>
      ) : null}

      <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>{plantPrimaryName(plant)}</Text>
      {plantCommonNameSubtitle(plant) ? (
        <Text style={[styles.commonName, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {plantCommonNameSubtitle(plant)}
        </Text>
      ) : null}
      {plant.species ? (
        <Text style={[styles.species, { fontFamily: fonts.displayItalic, color: colors.inkSoft }]}>
          {plant.species}
        </Text>
      ) : null}
      {plant.location ? (
        <Text style={[styles.location, { fontFamily: fonts.body, color: colors.inkSoft }]}>{plant.location}</Text>
      ) : null}

      {isOwner ? (
        plant.archived_at ? (
          <View style={[styles.unlistedTag, { backgroundColor: colors.sage }]}>
            <Text style={[styles.unlistedTagText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
              {t("plantDetail.archived.badge")}
            </Text>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingArchive(true)} hitSlop={8}>
            <Text style={[styles.editLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
              {t("plantDetail.archived.archiveLink")}
            </Text>
          </Pressable>
        )
      ) : null}

      <View style={styles.field}>
        <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
          {t("plantDetail.nickname.label")}
        </Text>
        {isEditingNickname ? (
          <>
            <TextInput
              style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholderTextColor={colors.inkSoft}
            />
            {nicknameSaveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {nicknameSaveError}
              </Text>
            ) : null}
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditingNickname(false)} hitSlop={8}>
                <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.moss }]}
                onPress={handleSaveNickname}
                disabled={nicknameSaveStatus === "saving"}
              >
                {nicknameSaveStatus === "saving" ? (
                  <ActivityIndicator color={colors.paper} />
                ) : (
                  <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                    {t("common.save")}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.dateRow}>
            <Text style={[styles.dateValue, { fontFamily: fonts.body, color: plant.nickname ? colors.ink : colors.inkSoft }]}>
              {plant.nickname ?? t("common.notSet")}
            </Text>
            {isOwner ? (
              <Pressable onPress={handleStartEditNickname} hitSlop={8}>
                <Text style={[styles.editLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  {t("plantDetail.nickname.editLink")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
          {t("plantDetail.acquiredDate.label")}
        </Text>
        {isEditingDate ? (
          <>
            <DatePickerField value={acquiredAtInput} onChange={setAcquiredAtInput} fonts={fonts} maxDate={todayISO()} />
            {saveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
            ) : null}
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditingDate(false)} hitSlop={8}>
                <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.moss }]}
                onPress={handleSaveDate}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving" ? (
                  <ActivityIndicator color={colors.paper} />
                ) : (
                  <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                    {t("common.save")}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.dateRow}>
            <Text style={[styles.dateValue, { fontFamily: fonts.body, color: plant.acquired_at ? colors.ink : colors.inkSoft }]}>
              {plant.acquired_at ? formatDisplayDate(plant.acquired_at) : t("common.notSet")}
            </Text>
            {isOwner ? (
              <Pressable onPress={handleStartEdit} hitSlop={8}>
                <Text style={[styles.editLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  {t("plantDetail.acquiredDate.editLink")}
                </Text>
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
                    {t("index.pill.labelStatus", { label: careTaskLabel(task.type, t), status: statusText(taskStatus, t) })}
                  </Text>
                </View>
              );
            })}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
          {t("plantDetail.progress.label")}
        </Text>

        {progressReports.length === 0 ? (
          <Text style={[styles.emptyText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("plantDetail.progress.empty")}
          </Text>
        ) : (
          <>
            {progressReports.filter((r) => r.height_cm !== null).length >= 2 ? (
              <HeightChart
                fonts={fonts}
                entries={progressReports
                  .filter((r): r is ProgressReport & { height_cm: number } => r.height_cm !== null)
                  .map((r) => ({ created_at: r.created_at, height_cm: r.height_cm }))
                  .reverse()}
              />
            ) : null}

            {progressReports.map((report) => (
              <Pressable
                key={report.id}
                style={[styles.progressRow, { borderColor: colors.line }]}
                onPress={() => router.push(`/progress/${report.id}`)}
              >
                <View style={styles.progressRowHeader}>
                  <Text style={[styles.progressDate, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                    {formatDisplayDate(report.created_at)}
                  </Text>
                  {report.height_cm !== null ? (
                    <Text style={[styles.progressHeight, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                      {t("common.heightUnit", { height: report.height_cm })}
                    </Text>
                  ) : null}
                  {!report.shared_to_feed ? (
                    <View style={[styles.unlistedTag, { backgroundColor: colors.sage }]}>
                      <Text style={[styles.unlistedTagText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
                        {t("plantDetail.progress.unlistedTag")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {report.notes ? (
                  <Text
                    style={[styles.progressNotes, { fontFamily: fonts.body, color: colors.inkSoft }]}
                    numberOfLines={2}
                  >
                    {report.notes}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </>
        )}
      </View>

      {isOwner || isSitting ? (
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("plantDetail.careTasks.label")}
          </Text>

          {tasksError && !confirmDeleteId && !markDonePromptId ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{tasksError}</Text>
          ) : null}

          {careTasks.map((task) => {
            const isBusy = busyTaskId === task.id;
            return (
              <View key={task.id} style={[styles.taskRow, { borderColor: colors.line }]}>
                <View style={styles.taskRowMain}>
                  <Text style={[styles.taskType, { fontFamily: fonts.bodySemiBold, color: colors.ink }]}>
                    {careTaskLabel(task.type, t)}
                  </Text>
                  <Text style={[styles.taskMeta, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                    {t(task.frequency_days === 1 ? "plantDetail.careTasks.frequencyOne" : "plantDetail.careTasks.frequencyMany", {
                      count: task.frequency_days,
                    })}{" "}
                    · {t("plantDetail.careTasks.lastDone", { date: formatTaskDate(task.last_done, t) })} ·{" "}
                    {t("plantDetail.careTasks.nextDue", { date: formatTaskDate(task.next_due, t) })}
                  </Text>
                </View>

                {isOwner && editingTaskId === task.id ? (
                  <View style={styles.taskEditRow}>
                    <TextInput
                      style={[styles.taskFrequencyInput, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                      value={editFrequencyInput}
                      onChangeText={setEditFrequencyInput}
                      keyboardType="number-pad"
                      placeholder={t("plantDetail.careTasks.frequencyPlaceholder")}
                      placeholderTextColor={colors.inkSoft}
                    />
                    <Pressable onPress={() => setEditingTaskId(null)} hitSlop={8}>
                      <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                        {t("common.cancel")}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleSaveFrequency(task)} hitSlop={8} disabled={!editFrequencyIsValid || isBusy}>
                      <Text
                        style={[
                          styles.taskActionLink,
                          { fontFamily: fonts.bodyMedium, color: editFrequencyIsValid ? colors.moss : colors.inkSoft },
                        ]}
                      >
                        {t("common.save")}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.taskActionsRow}>
                    <Pressable onPress={() => handleMarkDonePress(task)} hitSlop={8} disabled={isBusy}>
                      {isBusy ? (
                        <ActivityIndicator color={colors.moss} />
                      ) : (
                        <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                          {t("plantDetail.careTasks.markDone")}
                        </Text>
                      )}
                    </Pressable>
                    {isOwner ? (
                      <>
                        <Pressable onPress={() => handleStartEditFrequency(task)} hitSlop={8} disabled={isBusy}>
                          <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                            {t("plantDetail.careTasks.edit")}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => handleStartDelete(task)} hitSlop={8} disabled={isBusy}>
                          <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                            {t("plantDetail.careTasks.delete")}
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}

          {isOwner && isAddingTask ? (
            <View style={[styles.taskRow, { borderColor: colors.line }]}>
              <View style={styles.taskTypeRow}>
                {ALL_TASK_TYPES.filter((taskType) => !careTasks.some((task) => task.type === taskType)).map((taskType) => (
                  <Pressable
                    key={taskType}
                    style={[
                      styles.taskTypeChoice,
                      { borderColor: colors.line, backgroundColor: newTaskType === taskType ? colors.sage : "transparent" },
                    ]}
                    onPress={() => setNewTaskType(taskType)}
                  >
                    <Text style={[styles.taskMeta, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                      {careTaskLabel(taskType, t)}
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
                  placeholder={t("plantDetail.careTasks.frequencyPlaceholder")}
                  placeholderTextColor={colors.inkSoft}
                />
                <Pressable onPress={() => setIsAddingTask(false)} hitSlop={8}>
                  <Text style={[styles.cancelLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                    {t("common.cancel")}
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
                      {t("common.save")}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : isOwner &&
            !plant.archived_at &&
            ALL_TASK_TYPES.some((taskType) => !careTasks.some((task) => task.type === taskType)) ? (
            <Pressable onPress={handleStartAddTask} hitSlop={8} style={styles.addTaskLink}>
              <Text style={[styles.taskActionLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("plantDetail.careTasks.addTask")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {(isOwner || isSitting) && !plant.archived_at ? (
        <Pressable
          style={[styles.logProgressButton, { backgroundColor: colors.sage }]}
          onPress={() => router.push({ pathname: "/log-progress", params: { plantId: plant.id } })}
        >
          <Text style={[styles.logProgressText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
            {t("index.logProgress")}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>

    {pendingDeleteTask ? (
      <ConfirmModal
        message={t("plantDetail.careTasks.deleteConfirmPrompt")}
        actions={[
          {
            label: t("plantDetail.careTasks.confirm"),
            tone: "destructive",
            onPress: () => handleConfirmDelete(pendingDeleteTask),
          },
        ]}
        onCancel={() => {
          setConfirmDeleteId(null);
          setTasksError(null);
        }}
        busy={busyTaskId === pendingDeleteTask.id}
        errorText={tasksError}
        fonts={fonts}
      />
    ) : null}

    {pendingMarkDoneTask ? (
      <ConfirmModal
        message={t("plantDetail.careTasks.overduePrompt")}
        actions={[
          {
            label: t("plantDetail.careTasks.originalDueDate"),
            onPress: () =>
              executeMarkDone(pendingMarkDoneTask, pendingMarkDoneTask.next_due ? new Date(pendingMarkDoneTask.next_due) : undefined),
          },
          { label: t("plantDetail.careTasks.today"), onPress: () => executeMarkDone(pendingMarkDoneTask) },
        ]}
        onCancel={() => {
          setMarkDonePromptId(null);
          setTasksError(null);
        }}
        busy={busyTaskId === pendingMarkDoneTask.id}
        errorText={tasksError}
        fonts={fonts}
      />
    ) : null}

    {confirmingArchive ? (
      <ConfirmModal
        message={t("plantDetail.archived.confirmMessage")}
        actions={[{ label: t("plantDetail.archived.archiveLink"), onPress: handleArchive }]}
        onCancel={handleCancelArchiveConfirm}
        busy={archiveStatus === "archiving"}
        errorText={archiveStatus === "error" ? archiveError : null}
        fonts={fonts}
      />
    ) : null}
    </>
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
  name: {
    fontSize: 20,
  },
  commonName: {
    fontSize: 14,
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
  emptyText: {
    fontSize: 14,
  },
  progressRow: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  progressRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  progressDate: {
    fontSize: 13.5,
  },
  progressHeight: {
    fontSize: 13,
  },
  unlistedTag: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  unlistedTagText: {
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  progressNotes: {
    fontSize: 13.5,
    lineHeight: 19,
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
