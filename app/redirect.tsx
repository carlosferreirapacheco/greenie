import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../lib/ThemeContext";

// Native Google sign-in's OAuth redirect target (see
// signInWithGoogleNative() in lib/supabase/auth.ts). Android delivers
// the greenie://redirect deep link to expo-router's own navigation in
// parallel with expo-web-browser capturing it for the auth session, so
// this route needs to exist even though the actual session handling
// happens in signInWithGoogleNative() itself, not here -- it just
// bounces back to the root; app/_layout.tsx's session-based redirect
// takes it from there once the session lands.
export default function RedirectScreen() {
  const { colors } = useTheme();

  useEffect(() => {
    router.replace("/");
  }, []);

  return (
    <View style={[styles.center, { backgroundColor: colors.paper }]}>
      <ActivityIndicator color={colors.moss} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
