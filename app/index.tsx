import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getMyPlants, plantCommonNameSubtitle, plantPrimaryName, type Plant } from "../lib/supabase/plants";
import {
  getCareTasksForPlants,
  summarizeCareTasks,
  type PlantCareSummary,
  type PlantCareStatus,
} from "../lib/supabase/care_tasks";
import { getPendingFollowRequests } from "../lib/supabase/follows";
import { buildCareInstructionsText } from "../lib/careInstructions";
import { fontAssets, getFonts, getStatusColors, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

function statusText(status: PlantCareStatus): string {
  switch (status) {
    case "overdue":
      return "overdue";
    case "due_soon":
      return "due soon";
    case "healthy":
      return "healthy";
  }
}

function StatusPill({ label, status, fonts }: { label: string; status: PlantCareStatus; fonts: ReturnType<typeof getFonts> }) {
  const { colors } = useTheme();
  const palette = getStatusColors(colors)[status];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.pillText, { color: palette.fg, fontFamily: fonts.bodyMedium }]}>
        {label}: {statusText(status)}
      </Text>
    </View>
  );
}

export default function PlantListScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [careSummaries, setCareSummaries] = useState<Record<string, PlantCareSummary>>({});
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const fetchPlants = useCallback(() => {
    getMyPlants()
      .then(async (data) => {
        setPlants(data);

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
    getPendingFollowRequests()
      .then((requests) => setHasPendingRequests(requests.length > 0))
      .catch(() => {
        // Non-critical -- the badge just won't show if this fails.
      });
  }, []);

  // Refetches every time this screen gains focus (e.g. returning from
  // add-plant), not just on first mount.
  useFocusEffect(
    useCallback(() => {
      fetchPlants();
    }, [fetchPlants])
  );

  async function handleShareInstructions() {
    if (shareBusy) {
      return;
    }
    setShareBusy(true);
    setShareError(null);

    try {
      const tasks = await getCareTasksForPlants(plants.map((plant) => plant.id));
      const tasksByPlant: Record<string, typeof tasks> = {};
      for (const task of tasks) {
        (tasksByPlant[task.plant_id] ??= []).push(task);
      }
      const text = buildCareInstructionsText(plants.map((plant) => ({ ...plant, tasks: tasksByPlant[plant.id] ?? [] })));
      await Share.share({ message: text, title: "Plant care instructions" });
    } catch (err) {
      setShareError(getErrorMessage(err));
    } finally {
      setShareBusy(false);
    }
  }

  const screen = (
    <Stack.Screen
      options={{
        title: "Plants",
        headerLeft: () => (
          <View style={styles.headerLeftRow}>
            <Pressable onPress={() => router.push("/profile")} hitSlop={8}>
              <View style={[styles.profileAvatar, { backgroundColor: colors.sage }]} />
            </Pressable>
            <Pressable onPress={() => router.push("/following")} hitSlop={8} style={styles.badgeWrap}>
              <Text style={[styles.headerLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Following
              </Text>
              {hasPendingRequests ? <View style={[styles.badgeDot, { backgroundColor: colors.coral }]} /> : null}
            </Pressable>
            <Pressable onPress={() => router.push("/feed")} hitSlop={8}>
              <Text style={[styles.headerLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Feed
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/plant-sitting")} hitSlop={8}>
              <Text style={[styles.headerLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Sitting
              </Text>
            </Pressable>
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightRow}>
            <Pressable onPress={handleShareInstructions} disabled={shareBusy || plants.length === 0} hitSlop={8}>
              {shareBusy ? (
                <ActivityIndicator color={colors.moss} />
              ) : (
                <Text style={[styles.headerLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Share</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.push("/add-plant")} hitSlop={8} style={styles.addButtonWrap}>
              <Text style={[styles.addButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>+ Add</Text>
            </Pressable>
          </View>
        ),
      }}
    />
  );

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
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  if (plants.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        {screen}
        <Text style={{ fontFamily: fonts.body, color: colors.inkSoft }}>No plants yet</Text>
      </View>
    );
  }

  return (
    <>
      {screen}
      {shareError ? (
        <Text style={[styles.shareErrorText, { fontFamily: fonts.body, color: colors.coral }]}>{shareError}</Text>
      ) : null}
      <FlatList
        style={[styles.list, { backgroundColor: colors.paper }]}
        data={plants}
        keyExtractor={(plant) => plant.id}
        renderItem={({ item }) => {
        const summary = careSummaries[item.id];
        return (
          <View style={[styles.row, { borderBottomColor: colors.line }]}>
            <Pressable style={styles.plantLink} onPress={() => router.push(`/plant/${item.id}`)}>
              <View style={[styles.thumb, { backgroundColor: colors.sage }]} />
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
                      label={summary.primary.type === "water" ? "watering" : summary.primary.type}
                      status={summary.primary.status}
                      fonts={fonts}
                    />
                  ) : null}
                  {summary?.watering ? (
                    <StatusPill label="watering" status={summary.watering.status} fonts={fonts} />
                  ) : null}
                </View>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: "/log-progress", params: { plantId: item.id } })}
              hitSlop={8}
            >
              <Text style={[styles.logProgress, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Log progress
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
  addButton: {
    fontSize: 15,
  },
  addButtonWrap: {
    marginRight: spacing.md,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  shareErrorText: {
    fontSize: 13,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  profileAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  headerLink: {
    fontSize: 14,
  },
  badgeWrap: {
    position: "relative",
    paddingRight: 8,
  },
  badgeDot: {
    position: "absolute",
    top: -2,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
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
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
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
