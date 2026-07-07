import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { getMyPlants, type Plant } from "../lib/supabase/plants";
import {
  getCareTasksForPlants,
  summarizeCareTasks,
  type PlantCareSummary,
  type PlantCareStatus,
} from "../lib/supabase/care_tasks";

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

export default function PlantListScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [careSummaries, setCareSummaries] = useState<Record<string, PlantCareSummary>>({});

  useEffect(() => {
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

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.center}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  if (plants.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No plants yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={plants}
      keyExtractor={(plant) => plant.id}
      renderItem={({ item }) => {
        const summary = careSummaries[item.id];
        return (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            {item.species ? <Text style={styles.species}>{item.species}</Text> : null}
            {summary?.primary ? (
              <Text style={styles.status}>
                {summary.primary.type === "water" ? "watering" : summary.primary.type}:{" "}
                {statusText(summary.primary.status)}
              </Text>
            ) : null}
            {summary?.watering ? (
              <Text style={styles.status}>watering: {statusText(summary.watering.status)}</Text>
            ) : null}
          </View>
        );
      }}
    />
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
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  species: {
    fontSize: 14,
    color: "#666",
  },
  status: {
    fontSize: 13,
    color: "#444",
    marginTop: 2,
  },
});
