import { useCallback, useRef, useState } from "react";
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
import { router, Stack, useFocusEffect } from "expo-router";
import { acceptPrivacyPolicy, getMyProfile, updateMyProfile, type MyProfile } from "../lib/supabase/profiles";
import { normalizeUsername, validateUsername } from "../lib/supabase/usernames";
import { signOut } from "../lib/supabase/auth";
import { emitConsentAccepted } from "../lib/consentEvents";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";
import { getErrorMessage } from "../lib/errors";

// Two modes, both driven by the root layout's consent gate:
// - First-time (accepted_privacy_at null): fresh OAuth signups (review
//   what Google auto-populated, customize the generated username -- the
//   cooldown-free first change) and accounts created before the consent
//   stamp existed.
// - Re-consent (a stamp exists, but it's older than the policy's
//   effective date -- the policy changed): a slim "policy updated"
//   prompt with just the checkbox; no profile fields to review again.
export default function WelcomeScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSaving = useRef(false);

  const fetchProfile = useCallback(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setDisplayName((prev) => (prev.length > 0 ? prev : (data.display_name ?? "")));
        setUsername((prev) => (prev.length > 0 ? prev : data.username));
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  // A non-null stamp means the gate sent us here because the policy
  // changed after it -- only the acceptance itself needs redoing.
  const isReconsent = profile?.accepted_privacy_at !== null && profile !== null;

  const normalizedUsername = normalizeUsername(username);
  const usernameError = normalizedUsername.length > 0 ? validateUsername(normalizedUsername) : null;
  const canSave =
    (isReconsent || (normalizedUsername.length > 0 && usernameError === null)) &&
    privacyAccepted &&
    saveStatus !== "saving";

  async function handleSave() {
    if (!canSave || isSaving.current || !profile) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      if (!isReconsent) {
        await updateMyProfile({
          username: normalizedUsername,
          display_name: displayName.trim().length > 0 ? displayName.trim() : null,
          bio: profile.bio,
        });
      }
      await acceptPrivacyPolicy();
      // Open the root layout's consent gate before navigating so the
      // redirect-to-welcome rule doesn't race the profile refetch.
      emitConsentAccepted();
      router.replace("/");
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      // app/_layout.tsx's auth listener swaps back to the sign-in stack.
    } catch {
      // Losing this action is harmless -- the user can retry.
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("welcome.loadingScreenTitle") }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: t("welcome.errorScreenTitle") }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{t("welcome.error", { error: error ?? "" })}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: isReconsent ? t("welcome.reconsent.screenTitle") : t("welcome.firstTime.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { fontFamily: fonts.display, color: colors.ink }]}>
          {isReconsent ? t("welcome.reconsent.heading") : t("welcome.firstTime.heading")}
        </Text>
        <Text style={[styles.intro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {isReconsent ? t("welcome.reconsent.intro") : t("welcome.firstTime.intro")}
        </Text>

        {!isReconsent ? (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("welcome.firstTime.displayName.label")}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t("welcome.firstTime.displayName.placeholder")}
                placeholderTextColor={colors.inkSoft}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("welcome.firstTime.username.label")}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={username}
                onChangeText={setUsername}
                placeholder={t("welcome.firstTime.username.placeholder")}
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameError ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                  {usernameError}
                </Text>
              ) : (
                <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                  {t("welcome.firstTime.username.cooldownHint")}
                </Text>
              )}
            </View>
          </>
        ) : null}

        <Pressable style={styles.consentRow} onPress={() => setPrivacyAccepted((prev) => !prev)} hitSlop={4}>
          <View
            style={[
              styles.consentBox,
              privacyAccepted
                ? { backgroundColor: colors.moss, borderColor: colors.moss }
                : { backgroundColor: colors.paper, borderColor: colors.line },
            ]}
          >
            {privacyAccepted ? <Text style={[styles.consentCheck, { color: colors.paper }]}>✓</Text> : null}
          </View>
          <Text style={[styles.consentText, { fontFamily: fonts.body, color: colors.ink }]}>
            {t("welcome.consent.prefix")}
            <Text
              style={{ fontFamily: fonts.bodyMedium, color: colors.moss }}
              onPress={() => router.push("/privacy-policy")}
            >
              {t("welcome.consent.link")}
            </Text>
          </Text>
        </Pressable>

        {saveStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
        ) : null}

        <Pressable
          style={[styles.saveButton, { backgroundColor: canSave ? colors.moss : colors.line }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saveStatus === "saving" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {isReconsent ? t("welcome.reconsent.submitButton") : t("welcome.firstTime.submitButton")}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleSignOut} hitSlop={8}>
          <Text style={[styles.signOutLink, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {isReconsent ? t("welcome.reconsent.signOutLink") : t("welcome.firstTime.signOutLink")}
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
  },
  title: {
    fontSize: 24,
    textAlign: "center",
  },
  intro: {
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: "center",
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
  hint: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 13,
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
  saveButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
  },
  signOutLink: {
    fontSize: 13,
    textAlign: "center",
  },
});
