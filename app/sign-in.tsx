import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import { signInWithEmail, signInWithGoogle } from "../lib/supabase/auth";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

export default function SignInScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<"idle" | "signing-in" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Same synchronous-guard pattern as every other submit flow in this app.
  const isSubmitting = useRef(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && status !== "signing-in";

  async function handleSignIn() {
    if (!canSubmit || isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;

    setStatus("signing-in");
    setError(null);

    try {
      await signInWithEmail(email.trim(), password);
      // No navigation needed -- app/_layout.tsx's onAuthStateChange
      // listener swaps to the main app Stack once the session lands.
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  async function handleGoogleSignIn() {
    if (isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;

    setError(null);

    try {
      // Full-page redirect through Supabase to Google -- the page
      // unloads on success, so there's no post-call state to manage.
      await signInWithGoogle();
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Sign In", headerBackVisible: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { fontFamily: fonts.display, color: colors.ink }]}>Greenie</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Email</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Password</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.inkSoft}
            secureTextEntry
          />
        </View>

        {status === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{error}</Text>
        ) : null}

        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? colors.moss : colors.line }]}
          onPress={handleSignIn}
          disabled={!canSubmit}
        >
          {status === "signing-in" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.submitButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              Sign in
            </Text>
          )}
        </Pressable>

        {Platform.OS === "web" ? (
          <>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
              <Text style={[styles.dividerText, { fontFamily: fonts.body, color: colors.inkSoft }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
            </View>

            <Pressable
              style={[styles.googleButton, { borderColor: colors.line, backgroundColor: colors.paper }]}
              onPress={handleGoogleSignIn}
            >
              <Text style={[styles.googleButtonText, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                Continue with Google
              </Text>
            </Pressable>
          </>
        ) : null}

        <Pressable onPress={() => router.push("/sign-up")} hitSlop={8}>
          <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Create account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.md,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
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
  submitButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
  },
  link: {
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
  googleButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  googleButtonText: {
    fontSize: 15,
  },
});
