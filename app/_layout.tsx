import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { ensureSession } from "../lib/supabase/session";
import { colors, fontAssets, getFonts } from "../lib/theme";

export default function RootLayout() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    ensureSession()
      .then(() => setStatus("ready"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, []);

  const fonts = getFonts(fontsLoaded && !fontError);

  if (status === "loading" || (!fontsLoaded && !fontError)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Failed to sign in: {error}</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
        headerTintColor: colors.moss,
        contentStyle: { backgroundColor: colors.paper },
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
});
