import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import { colors, fontAssets, getFonts } from "../lib/theme";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fonts = getFonts(fontsLoaded && !fontError);

  if (!sessionLoaded || (!fontsLoaded && !fontError)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  const screenOptions = {
    headerStyle: { backgroundColor: colors.paper },
    headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
    headerTintColor: colors.moss,
    headerTitleAlign: "center" as const,
    contentStyle: { backgroundColor: colors.paper },
  };

  const inAuthGroup = segments[0] === "sign-in" || segments[0] === "sign-up";

  if (!session && !inAuthGroup) {
    return <Redirect href="/sign-in" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={screenOptions} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
