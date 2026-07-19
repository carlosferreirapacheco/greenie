import { useEffect, useRef, useState } from "react";
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
import { Stack } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase/client";
import { signInWithEmail, signInWithGoogle } from "../lib/supabase/auth";
import { AccountDeletionFlow } from "../components/AccountDeletionFlow";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

// The Google Play-required public account-deletion page: reachable
// without installing or signing into the app first (see the
// inPublicGroup carve-out in app/_layout.tsx, the same mechanism that
// already exempts /privacy-policy). Tracks its own session locally
// rather than relying on the root layout, since this route intentionally
// sits outside the normal signed-in app shell.
export default function DeleteAccountScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInStatus, setSignInStatus] = useState<"idle" | "signing-in" | "error">("idle");
  const [signInError, setSignInError] = useState<string | null>(null);
  const isSigningIn = useRef(false);
  const isStartingGoogle = useRef(false);

  const canSignIn = email.trim().length > 0 && password.length > 0 && signInStatus !== "signing-in";

  async function handleSignIn() {
    if (!canSignIn || isSigningIn.current) {
      return;
    }
    isSigningIn.current = true;

    setSignInStatus("signing-in");
    setSignInError(null);

    try {
      await signInWithEmail(email.trim(), password);
      // No navigation needed -- the onAuthStateChange listener above
      // picks up the new session and swaps in the deletion flow.
    } catch (err) {
      setSignInError(getErrorMessage(err));
      setSignInStatus("error");
    } finally {
      isSigningIn.current = false;
    }
  }

  async function handleGoogleSignIn() {
    if (isStartingGoogle.current) {
      return;
    }
    isStartingGoogle.current = true;

    setSignInError(null);

    try {
      // Full-page redirect -- sends the user back to this same page
      // (not the app root) once the OAuth round trip completes.
      await signInWithGoogle("/delete-account");
    } catch (err) {
      setSignInError(getErrorMessage(err));
      setSignInStatus("error");
    } finally {
      isStartingGoogle.current = false;
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: t("deleteAccount.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("deleteAccount.heading")}
        </Text>

        {deleted ? (
          <Text style={[styles.body, { fontFamily: fonts.body, color: colors.ink }]}>
            {t("deleteAccount.deletedMessage")}
          </Text>
        ) : (
          <>
            <Text style={[styles.body, { fontFamily: fonts.body, color: colors.ink }]}>
              {t("deleteAccount.intro")}
            </Text>

            {session === undefined ? (
              <ActivityIndicator color={colors.moss} />
            ) : session ? (
              <AccountDeletionFlow fonts={fonts} onDeleted={() => setDeleted(true)} />
            ) : (
              <View style={styles.signInBlock}>
                <View style={styles.field}>
                  <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                    {t("signIn.email.label")}
                  </Text>
                  <TextInput
                    style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t("signIn.email.placeholder")}
                    placeholderTextColor={colors.inkSoft}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                    {t("signIn.password.label")}
                  </Text>
                  <TextInput
                    style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t("signIn.password.placeholder")}
                    placeholderTextColor={colors.inkSoft}
                    secureTextEntry
                  />
                </View>

                {signInStatus === "error" ? (
                  <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                    {signInError}
                  </Text>
                ) : null}

                <Pressable
                  style={[styles.submitButton, { backgroundColor: canSignIn ? colors.moss : colors.line }]}
                  onPress={handleSignIn}
                  disabled={!canSignIn}
                >
                  {signInStatus === "signing-in" ? (
                    <ActivityIndicator color={colors.paper} />
                  ) : (
                    <Text style={[styles.submitButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                      {t("signIn.submitButton")}
                    </Text>
                  )}
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                  <Text style={[styles.dividerText, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                    {t("signIn.divider")}
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                </View>

                <Pressable
                  style={[styles.googleButton, { borderColor: colors.line, backgroundColor: colors.paper }]}
                  onPress={handleGoogleSignIn}
                >
                  <Text style={[styles.googleButtonText, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                    {t("signIn.googleButton")}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  heading: {
    fontSize: 22,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  signInBlock: {
    gap: spacing.md,
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
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
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
