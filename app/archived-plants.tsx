import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import {
  deletePlant,
  getArchivedPlants,
  getMyPlants,
  plantCommonNameSubtitle,
  plantPrimaryName,
  restorePlant,
  type Plant,
} from "../lib/supabase/plants";
import { dismissStaleCareDueNotifications } from "../lib/pushNotificationManager";
import { PhotoThumb } from "../components/PhotoThumb";
import { ConfirmModal } from "../components/ConfirmModal";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

function ArchivedPlantRow({
  plant,
  fonts,
  busy,
  onRestore,
  onDeletePress,
}: {
  plant: Plant;
  fonts: ReturnType<typeof getFonts>;
  busy: boolean;
  onRestore: () => void;
  onDeletePress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={[styles.row, { borderBottomColor: colors.line }]}>
      <Pressable style={styles.plantLink} onPress={() => router.push(`/plant/${plant.id}`)}>
        <PhotoThumb uri={plant.photo_urls?.[0] ?? null} size={56} radius={radius.sm} />
        <View style={styles.rowText}>
          <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
            {plantPrimaryName(plant)}
          </Text>
          {plantCommonNameSubtitle(plant) ? (
            <Text style={[styles.commonName, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              {plantCommonNameSubtitle(plant)}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={colors.moss} />
        ) : (
          <>
            <Pressable onPress={onRestore} hitSlop={8}>
              <Text style={[styles.actionLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("archivedPlants.row.restore")}
              </Text>
            </Pressable>
            <Pressable onPress={onDeletePress} hitSlop={8}>
              <Text style={[styles.actionLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                {t("archivedPlants.row.delete")}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default function ArchivedPlantsScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Plant | null>(null);
  const busyRef = useRef<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchArchivedPlants = useCallback(() => {
    getArchivedPlants()
      .then((data) => {
        setPlants(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchArchivedPlants();
    }, [fetchArchivedPlants])
  );

  // Best-effort: clears any already-delivered care_due tray
  // notification that's now stale for the plant just restored/deleted.
  function reconcileNotifications() {
    getMyPlants()
      .then((myPlants) => dismissStaleCareDueNotifications(myPlants.map((p) => p.id)))
      .catch(() => {});
  }

  async function handleRestore(plantId: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = plantId;
    setBusyId(plantId);
    setActionError(null);

    try {
      await restorePlant(plantId);
      setPlants((prev) => prev.filter((plant) => plant.id !== plantId));
      reconcileNotifications();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }

  async function handleDelete(plantId: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = plantId;
    setBusyId(plantId);
    setActionError(null);

    try {
      await deletePlant(plantId);
      setPlants((prev) => prev.filter((plant) => plant.id !== plantId));
      setPendingDelete(null);
      reconcileNotifications();
    } catch (err) {
      // Leaves pendingDelete set -- the modal stays open with the error
      // shown inline instead of silently vanishing.
      setActionError(getErrorMessage(err));
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }

  const screen = <Stack.Screen options={{ title: t("archivedPlants.screenTitle") }} />;

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>
          {t("archivedPlants.error", { error: error ?? "" })}
        </Text>
      </View>
    );
  }

  if (plants.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("archivedPlants.emptyState")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.paper }]}>
      {screen}
      {actionError ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{actionError}</Text>
      ) : null}
      <FlatList
        style={styles.list}
        data={plants}
        keyExtractor={(plant) => plant.id}
        renderItem={({ item }) => (
          <ArchivedPlantRow
            plant={item}
            fonts={fonts}
            busy={busyId === item.id}
            onRestore={() => handleRestore(item.id)}
            onDeletePress={() => setPendingDelete(item)}
          />
        )}
      />

      {pendingDelete ? (
        <ConfirmModal
          message={t("archivedPlants.confirmDelete.message", { name: plantPrimaryName(pendingDelete) })}
          actions={[
            {
              label: t("archivedPlants.row.delete"),
              tone: "destructive",
              onPress: () => handleDelete(pendingDelete.id),
            },
          ]}
          onCancel={() => setPendingDelete(null)}
          busy={busyId === pendingDelete.id}
          errorText={actionError}
          fonts={fonts}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 13,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  plantLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
  },
  commonName: {
    fontSize: 12.5,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionLink: {
    fontSize: 13.5,
  },
});
