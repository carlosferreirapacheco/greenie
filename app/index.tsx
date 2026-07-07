import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { getMyPlants, type Plant } from "../lib/supabase/plants";

export default function PlantListScreen() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);

  useEffect(() => {
    getMyPlants()
      .then((data) => {
        setPlants(data);
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
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          {item.species ? <Text style={styles.species}>{item.species}</Text> : null}
        </View>
      )}
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
});
