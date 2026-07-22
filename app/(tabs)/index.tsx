import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, useFocusEffect } from "expo-router";
import { getMyPlants, plantCommonNameSubtitle, plantPrimaryName, type Plant } from "../../lib/supabase/plants";
import {
  getCareTasksForPlants,
  summarizeCareTasks,
  type CareTaskType,
  type PlantCareSummary,
  type PlantCareStatus,
} from "../../lib/supabase/care_tasks";
import { PhotoThumb } from "../../components/PhotoThumb";
import { dismissStaleCareDueNotifications } from "../../lib/pushNotificationManager";
import { fontAssets, getFonts, getStatusColors, radius, spacing } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { useLanguage } from "../../lib/LanguageContext";
import { getErrorMessage } from "../../lib/errors";

function careTypeLabel(type: CareTaskType, t: (key: string) => string): string {
  return type === "water" ? t("index.careType.watering") : t(`index.careType.${type}`);
}

function statusText(status: PlantCareStatus, t: (key: string) => string): string {
  switch (status) {
    case "overdue":
      return t("index.status.overdue");
    case "due_soon":
      return t("index.status.dueSoon");
    case "healthy":
      return t("index.status.healthy");
  }
}

function StatusPill({ label, status, fonts }: { label: string; status: PlantCareStatus; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const palette = getStatusColors(colors)[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.pillText, { color: palette.fg, fontFamily: fonts.bodyMedium }]}>
        {t("index.pill.labelStatus", { label, status: statusText(status, t) })}
      </Text>
    </View>
  );
}

export default function PlantListScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [careSummaries, setCareSummaries] = useState<Record<string, PlantCareSummary>>({});
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const fetchPlants = useCallback(() => {
    getMyPlants()
      .then(async (data) => {
        setPlants(data);
        // Safety net for plants removed out-of-band (e.g. directly via
        // SQL) -- clears any already-delivered care_due tray
        // notification for a plant that's no longer in this list.
        dismissStaleCareDueNotifications(data.map((plant) => plant.id));

        const tasks = await getCareTasksForPlants(data.map((plant) => plant.id));
        const tasksByPlant: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          (tasksByPlant[task.plant_id] ??= []).push(task);
        }

        const summaries: Record<string, PlantCareSummary> = {};
        for (const plant of data) {
          summaries[plant.id] = summarizeCareTasks(tasksByPlant[plant.id] ?? []);
        }
        setCareSummaries(summaries);
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  // Refetches every time this screen gains focus (e.g. returning from
  // add-plant), not just on first mount.
  useFocusEffect(
    useCallback(() => {
      fetchPlants();
    }, [fetchPlants])
  );

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("index.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  if (plants.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>{t("index.emptyState")}</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={[styles.list, { backgroundColor: colors.paper }]}
        data={plants}
        keyExtractor={(plant) => plant.id}
        renderItem={({ item }) => {
        const summary = careSummaries[item.id];
        return (
          <View style={[styles.row, { borderBottomColor: colors.line }]}>
            <Pressable style={styles.plantLink} onPress={() => router.push(`/plant/${item.id}`)}>
              <PhotoThumb uri={item.photo_urls?.[0] ?? null} size={56} radius={radius.sm} />
              <View style={styles.rowText}>
                <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>
                  {plantPrimaryName(item)}
                </Text>
                {plantCommonNameSubtitle(item) ? (
                  <Text style={[styles.commonName, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                    {plantCommonNameSubtitle(item)}
                  </Text>
                ) : null}
                {item.species ? (
                  <Text style={[styles.species, { fontFamily: fonts.displayItalic, color: colors.inkSoft }]}>
                    {item.species}
                  </Text>
                ) : null}
                <View style={styles.pillRow}>
                  {summary?.primary ? (
                    <StatusPill
                      label={careTypeLabel(summary.primary.type, t)}
                      status={summary.primary.status}
                      fonts={fonts}
                    />
                  ) : null}
                  {summary?.watering ? (
                    <StatusPill label={t("index.careType.watering")} status={summary.watering.status} fonts={fonts} />
                  ) : null}
                </View>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: "/log-progress", params: { plantId: item.id } })}
              hitSlop={8}
            >
              <Text style={[styles.logProgress, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("index.logProgress")}
              </Text>
            </Pressable>
          </View>
        );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 17,
  },
  commonName: {
    fontSize: 13,
    marginTop: 2,
  },
  species: {
    fontSize: 13.5,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
  },
  logProgress: {
    fontSize: 12,
  },
});
