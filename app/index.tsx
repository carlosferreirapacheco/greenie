import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { router, Stack, useFocusEffect } from "expo-router";
import { getMyPlants, type Plant } from "../lib/supabase/plants";
import {
  getCareTasksForPlants,
  summarizeCareTasks,
  type PlantCareSummary,
  type PlantCareStatus,
} from "../lib/supabase/care_tasks";
import { colors, fontAssets, getFonts, radius, spacing, statusColors } from "../lib/theme";

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
  const palette = statusColors[status];
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
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

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
        setError(err instanceof Error ? err.message : String(err));
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

  const screen = (
    <Stack.Screen
      options={{
        title: "Plants",
        headerLeft: () => (
          <View style={styles.headerLeftRow}>
            <Pressable onPress={() => router.push("/profile")} hitSlop={8}>
              <View style={[styles.profileAvatar, { backgroundColor: colors.sage }]} />
            </Pressable>
            <Pressable onPress={() => router.push("/friends")} hitSlop={8}>
              <Text style={[styles.friendsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Friends
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/feed")} hitSlop={8}>
              <Text style={[styles.friendsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Feed
              </Text>
            </Pressable>
          </View>
        ),
        headerRight: () => (
          <Pressable onPress={() => router.push("/add-plant")} hitSlop={8} style={styles.addButtonWrap}>
            <Text style={[styles.addButton, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>+ Add</Text>
          </Pressable>
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
      <FlatList
        style={[styles.list, { backgroundColor: colors.paper }]}
        data={plants}
        keyExtractor={(plant) => plant.id}
        renderItem={({ item }) => {
        const summary = careSummaries[item.id];
        return (
          <View style={[styles.row, { borderBottomColor: colors.line }]}>
            <View style={[styles.thumb, { backgroundColor: colors.sage }]} />
            <View style={styles.rowText}>
              <Text style={[styles.name, { fontFamily: fonts.display, color: colors.ink }]}>{item.name}</Text>
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
  friendsLink: {
    fontSize: 14,
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
