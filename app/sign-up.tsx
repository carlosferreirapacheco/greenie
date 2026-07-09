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
import { signUpWithEmail } from "../lib/supabase/auth";
import { isUsernameAvailable, normalizeUsername, validateUsername } from "../lib/supabase/usernames";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { getErrorMessage } from "../lib/errors";

export default function SignUpScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [status, setStatus] = useState<"idle" | "submitting" | "check-email" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Same synchronous-guard pattern as every other submit flow in this app.
  const isSubmitting = useRef(false);

  const normalizedUsername = normalizeUsername(username);
  const usernameError = normalizedUsername.length > 0 ? validateUsername(normalizedUsername) : null;

  const canSubmit =
    email.trim().length > 0 &&
    normalizedUsername.length > 0 &&
    usernameError === null &&
    password.length >= 6 &&
    privacyAccepted &&
    status !== "submitting";

  async function handleSignUp() {
    if (!canSubmit || isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;

    setStatus("submitting");
    setError(null);

    try {
      // Pre-check so a taken username gets a friendly message instead of
      // the signup silently falling back to a generated username (the
      // handle_new_user trigger never fails signups over usernames).
      if (!(await isUsernameAvailable(normalizedUsername))) {
        setError("That username is already taken");
        setStatus("error");
        return;
      }

      const { session } = await signUpWithEmail(email.trim(), password, normalizedUsername, privacyAccepted);
      if (!session) {
        // Project has email confirmation on -- no session until the user
        // clicks the link in their inbox.
        setStatus("check-email");
      }
      // If a session did come back, app/_layout.tsx's onAuthStateChange
      // listener swaps to the main app Stack automatically.
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  if (status === "check-email") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Create Account" }} />
        <Text style={[styles.checkEmailText, { fontFamily: fonts.body, color: colors.ink }]}>
          Check your email to confirm your account, then sign in.
        </Text>
        <Pressable onPress={() => router.replace("/sign-in")} hitSlop={8}>
          <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Create Account" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { fontFamily: fonts.display, color: colors.ink }]}>Create account</Text>

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
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Username</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. plant.parent_42"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameError ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{usernameError}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Password (min. 6 characters)
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.inkSoft}
            secureTextEntry
          />
        </View>

        <Pressable style={styles.consentRow} onPress={() => setPrivacyAccepted((prev) => !prev)} hitSlop={4}>
          <View
            style={[
              styles.consentBox,
              privacyAccepted
                ? { backgroundColor: colors.moss, borderColor: colors.moss }
                : { backgroundColor: colors.paper, borderColor: colors.line },
            ]}
          >
            {privacyAccepted ? (
              <Text style={[styles.consentCheck, { color: colors.paper }]}>✓</Text>
            ) : null}
          </View>
          <Text style={[styles.consentText, { fontFamily: fonts.body, color: colors.ink }]}>
            I have read and agree to the{" "}
            <Text
              style={{ fontFamily: fonts.bodyMedium, color: colors.moss }}
              onPress={() => router.push("/privacy-policy")}
            >
              Privacy Policy
            </Text>
          </Text>
        </Pressable>

        {status === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{error}</Text>
        ) : null}

        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? colors.moss : colors.line }]}
          onPress={handleSignUp}
          disabled={!canSubmit}
        >
          {status === "submitting" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.submitButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              Create account
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/sign-in")} hitSlop={8}>
          <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            Already have an account? Sign in
          </Text>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
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
  checkEmailText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  consentBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  consentCheck: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "700",
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
});
