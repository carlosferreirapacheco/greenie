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
import { signInWithGoogle, signUpWithEmail, verifySignupCode } from "../lib/supabase/auth";
import { isUsernameAvailable, normalizeUsername, validateUsername } from "../lib/supabase/usernames";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

export default function SignUpScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [status, setStatus] = useState<"idle" | "submitting" | "check-email" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [confirmCode, setConfirmCode] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Same synchronous-guard pattern as every other submit flow in this app.
  const isSubmitting = useRef(false);
  const isConfirming = useRef(false);

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
        setError(t("signUp.usernameTakenError"));
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

  async function handleConfirmCode() {
    if (confirmCode.trim().length === 0 || isConfirming.current) {
      return;
    }
    isConfirming.current = true;

    setConfirmStatus("submitting");
    setConfirmError(null);

    try {
      await verifySignupCode(email.trim(), confirmCode);
      // If it succeeds, app/_layout.tsx's onAuthStateChange listener
      // swaps to the main app Stack automatically -- same as any other
      // sign-in.
    } catch (err) {
      setConfirmError(getErrorMessage(err));
      setConfirmStatus("error");
    } finally {
      isConfirming.current = false;
    }
  }

  async function handleGoogleSignIn() {
    if (isSubmitting.current) {
      return;
    }
    isSubmitting.current = true;

    setError(null);

    try {
      // Full-page redirect through Supabase to Google -- consent is
      // collected on the welcome screen afterwards, since Google
      // signups never see this form's checkbox.
      await signInWithGoogle();
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus("error");
    } finally {
      isSubmitting.current = false;
    }
  }

  if (status === "check-email") {
    const canConfirm = confirmCode.trim().length > 0 && confirmStatus !== "submitting";

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.paper }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Stack.Screen options={{ title: t("signUp.checkEmail.screenTitle") }} />
        <View style={styles.center}>
          <Text style={[styles.checkEmailText, { fontFamily: fonts.body, color: colors.ink }]}>
            {t("signUp.checkEmail.message", { email: email.trim() })}
          </Text>

          <View style={styles.field}>
            <TextInput
              style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
              value={confirmCode}
              onChangeText={setConfirmCode}
              placeholder="123456"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
          </View>

          {confirmStatus === "error" ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{confirmError}</Text>
          ) : null}

          <Pressable
            style={[styles.submitButton, { backgroundColor: canConfirm ? colors.moss : colors.line }]}
            onPress={handleConfirmCode}
            disabled={!canConfirm}
          >
            {confirmStatus === "submitting" ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <Text style={[styles.submitButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                {t("signUp.checkEmail.confirmButton")}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace("/sign-in")} hitSlop={8}>
            <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
              {t("signUp.checkEmail.backToSignInLink")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: t("signUp.form.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { fontFamily: fonts.display, color: colors.ink }]}>{t("signUp.form.heading")}</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("signUp.form.email.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={email}
            onChangeText={setEmail}
            placeholder={t("signUp.form.email.placeholder")}
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("signUp.form.username.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t("signUp.form.username.placeholder")}
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
            {t("signUp.form.password.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={password}
            onChangeText={setPassword}
            placeholder={t("signUp.form.password.placeholder")}
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
            {t("signUp.form.consent.prefix")}
            <Text
              style={{ fontFamily: fonts.bodyMedium, color: colors.moss }}
              onPress={() => router.push("/privacy-policy")}
            >
              {t("signUp.form.consent.link")}
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
              {t("signUp.form.submitButton")}
            </Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
          <Text style={[styles.dividerText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("signUp.form.divider")}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
        </View>

        <Pressable
          style={[styles.googleButton, { borderColor: colors.line, backgroundColor: colors.paper }]}
          onPress={handleGoogleSignIn}
        >
          <Text style={[styles.googleButtonText, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
            {t("signUp.form.googleButton")}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/sign-in")} hitSlop={8}>
          <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {t("signUp.form.signInLink")}
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
