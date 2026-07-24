import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  accountHasPassword,
  changeAccountEmail,
  completePendingGoogleLinkSync,
  getLinkedGoogleEmail,
  linkGoogleAccount,
  requestCurrentEmailConfirmationCode,
  unlinkGoogleIdentity,
  updatePasswordWithReauth,
  verifyCurrentEmailConfirmationCode,
} from "../lib/supabase/auth";
import { collectMyData, emailMyDataExport } from "../lib/supabase/gdpr";
import {
  getMyProfile,
  updateBadgeSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  type BadgeSettings,
  type FollowPolicy,
  type NotificationSettings,
  type PlantSitterAttribution,
  type ProfileVisibility,
  type ProgressVisibility,
} from "../lib/supabase/profiles";
import { computeSupporterTier, type SupporterTier } from "../lib/badges";
import { getPushEnabled, setPushEnabled } from "../lib/pushNotificationManager";
import { getErrorMessage } from "../lib/errors";
import { ChipGroup } from "../components/ChipGroup";
import { ConfirmModal } from "../components/ConfirmModal";
import { SupportHintModal } from "../components/SupportHintModal";
import { AccountDeletionFlow } from "../components/AccountDeletionFlow";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

const SUPPORT_LINK_URL = "https://buymeacoffee.com/carlos.pacheco";

// One On/Off row per notification kind, in inbox-relevance order. labelKey
// is a settings.notifications.prefRows.* translation key, not literal text.
const NOTIFICATION_PREF_ROWS: { key: keyof NotificationSettings; labelKey: string }[] = [
  { key: "notify_care_tasks", labelKey: "settings.notifications.prefRows.careTaskReminders" },
  { key: "notify_comments", labelKey: "settings.notifications.prefRows.comments" },
  { key: "notify_likes", labelKey: "settings.notifications.prefRows.likes" },
  { key: "notify_follow_requests", labelKey: "settings.notifications.prefRows.followRequests" },
  { key: "notify_new_followers", labelKey: "settings.notifications.prefRows.newFollowers" },
  { key: "notify_follow_accepted", labelKey: "settings.notifications.prefRows.followRequestAccepted" },
  { key: "notify_sitting_requests", labelKey: "settings.notifications.prefRows.sittingRequests" },
  { key: "notify_sitting_responses", labelKey: "settings.notifications.prefRows.sittingResponses" },
];

// A row only appears once the account actually qualifies for that
// badge kind -- a future 3rd badge kind is one more entry here, not a
// rework of the section below.
const BADGE_TOGGLE_ROWS: {
  key: keyof BadgeSettings;
  labelKey: string;
  descKey: string;
  isEligible: (ctx: { supporterTier: SupporterTier | null; isBetaTester: boolean }) => boolean;
}[] = [
  {
    key: "show_supporter_badge",
    labelKey: "settings.badges.supporterToggle.label",
    descKey: "settings.badges.supporterToggle.desc",
    isEligible: (ctx) => ctx.supporterTier !== null,
  },
  {
    key: "show_beta_tester_badge",
    labelKey: "settings.badges.betaTesterToggle.label",
    descKey: "settings.badges.betaTesterToggle.desc",
    isEligible: (ctx) => ctx.isBetaTester,
  },
];

export default function SettingsScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors, themePreference, setThemePreference } = useTheme();
  const { t, languagePreference, setLanguagePreference } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx and app/profile.tsx.
  const isSaving = useRef(false);

  const newPasswordIsValid = newPassword.length >= 6;
  const passwordsMatch = newPassword === confirmPassword;

  const canSave =
    currentPassword.length > 0 &&
    newPasswordIsValid &&
    passwordsMatch &&
    saveStatus !== "saving";

  async function handleSave() {
    if (!canSave || isSaving.current) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await updatePasswordWithReauth(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaveStatus("saved");
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  const [privacyStatus, setPrivacyStatus] = useState<"loading" | "ready" | "error">("loading");
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>("public");
  const [followPolicy, setFollowPolicy] = useState<FollowPolicy>("open");
  const [progressVisibility, setProgressVisibility] = useState<ProgressVisibility>("public");
  const [plantSitterAttribution, setPlantSitterAttribution] = useState<PlantSitterAttribution>("allowed");
  const [privacySaveStatus, setPrivacySaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [privacySaveError, setPrivacySaveError] = useState<string | null>(null);
  const isSavingPrivacy = useRef(false);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationSettings | null>(null);
  const [notifSaveStatus, setNotifSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [notifSaveError, setNotifSaveError] = useState<string | null>(null);
  const isSavingNotifications = useRef(false);

  const [supporterTier, setSupporterTier] = useState<SupporterTier | null>(null);
  const [isBetaTester, setIsBetaTester] = useState(false);
  const [badgeSettings, setBadgeSettings] = useState<BadgeSettings | null>(null);
  const [badgeSaveStatus, setBadgeSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [badgeSaveError, setBadgeSaveError] = useState<string | null>(null);
  const isSavingBadges = useRef(false);

  // Device-local (AsyncStorage), not an account setting -- null while
  // the stored value loads. Instant persist like the theme preference.
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const isTogglingPush = useRef(false);

  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // null = not resolved yet, which keeps the regular password UI -- also
  // the fallback if the identities lookup fails, leaving a passwordless
  // account no worse off than before this check existed.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailCodeStatus, setEmailCodeStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailCodeError, setEmailCodeError] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [emailChangeStatus, setEmailChangeStatus] = useState<"idle" | "changing" | "changed" | "error">("idle");
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const isSendingEmailCode = useRef(false);
  const isChangingEmail = useRef(false);

  // null = not linked; otherwise the linked Google identity's own
  // email, shown alongside the primary email so a manual change
  // (which never touches the linked identity) doesn't silently drift
  // out of sync -- see getLinkedGoogleEmail().
  const [googleLinkedEmail, setGoogleLinkedEmail] = useState<string | null>(null);
  const [googleLinkCodeStatus, setGoogleLinkCodeStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [googleLinkCodeError, setGoogleLinkCodeError] = useState<string | null>(null);
  const [googleLinkCode, setGoogleLinkCode] = useState("");
  const [googleLinkStatus, setGoogleLinkStatus] = useState<"idle" | "linking" | "error">("idle");
  const [googleLinkError, setGoogleLinkError] = useState<string | null>(null);
  const [googleSyncBanner, setGoogleSyncBanner] = useState<string | null>(null);
  const [showUnlinkGoogleConfirm, setShowUnlinkGoogleConfirm] = useState(false);
  const [showSupportHint, setShowSupportHint] = useState(false);
  const [unlinkGoogleStatus, setUnlinkGoogleStatus] = useState<"idle" | "unlinking" | "error">("idle");
  const [unlinkGoogleError, setUnlinkGoogleError] = useState<string | null>(null);
  const isSendingGoogleLinkCode = useRef(false);
  const isLinkingGoogle = useRef(false);

  const fetchPrivacySettings = useCallback(() => {
    getMyProfile()
      .then((profile) => {
        setProfileVisibility(profile.profile_visibility);
        setFollowPolicy(profile.follow_policy);
        setProgressVisibility(profile.progress_visibility);
        setPlantSitterAttribution(profile.plant_sitter_attribution);
        setNotificationPrefs({
          notify_care_tasks: profile.notify_care_tasks,
          notify_comments: profile.notify_comments,
          notify_likes: profile.notify_likes,
          notify_follow_requests: profile.notify_follow_requests,
          notify_new_followers: profile.notify_new_followers,
          notify_follow_accepted: profile.notify_follow_accepted,
          notify_sitting_requests: profile.notify_sitting_requests,
          notify_sitting_responses: profile.notify_sitting_responses,
        });
        setSupporterTier(computeSupporterTier(profile.total_donated));
        setIsBetaTester(profile.is_beta_tester);
        setBadgeSettings({
          show_supporter_badge: profile.show_supporter_badge,
          show_beta_tester_badge: profile.show_beta_tester_badge,
        });
        setAccountEmail(profile.email);
        setPrivacyStatus("ready");
      })
      .catch((err) => {
        setPrivacyError(getErrorMessage(err));
        setPrivacyStatus("error");
      });

    accountHasPassword()
      .then(setHasPassword)
      .catch(() => setHasPassword(null));

    getLinkedGoogleEmail()
      .then(setGoogleLinkedEmail)
      .catch(() => setGoogleLinkedEmail(null));

    getPushEnabled()
      .then(setPushOn)
      .catch(() => setPushOn(false));

    // If linkGoogleAccount() redirected away and just landed back here,
    // this picks up where it left off -- see completePendingGoogleLinkSync().
    completePendingGoogleLinkSync()
      .then((syncedEmail) => {
        if (syncedEmail) {
          setGoogleSyncBanner(t("settings.emailLinkedAccounts.googleSyncBanner", { email: syncedEmail }));
        }
      })
      .catch(() => {
        // Non-critical -- the identity is already linked either way, and
        // the user can still change their email manually if this failed.
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPrivacySettings();
    }, [fetchPrivacySettings])
  );

  function handleOpenSupportLink() {
    Linking.openURL(SUPPORT_LINK_URL).catch((err) => {
      console.error("Failed to open support link:", err);
    });
  }

  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const isExporting = useRef(false);

  async function handleDownloadData() {
    if (isExporting.current) {
      return;
    }
    isExporting.current = true;

    setExportStatus("exporting");
    setExportError(null);

    try {
      const data = await collectMyData();
      const json = JSON.stringify(data, null, 2);
      const filename = `greenie-data-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === "web") {
        const doc = (globalThis as unknown as { document: Document }).document;
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        doc.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } else {
        // Written to the cache dir, not documents -- this is a one-shot
        // export artifact, not app state to persist; the share sheet is
        // where the user actually decides where it ends up. No
        // cancel-detection: expo-sharing doesn't give a reliable
        // cross-platform "user dismissed the sheet" signal.
        const file = new File(Paths.cache, filename);
        file.write(json);

        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("Sharing isn't available on this device");
        }
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Your Greenie data" });
      }
      setExportStatus("idle");
    } catch (err) {
      setExportError(getErrorMessage(err));
      setExportStatus("error");
    } finally {
      isExporting.current = false;
    }
  }

  const [emailExportStatus, setEmailExportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailExportError, setEmailExportError] = useState<string | null>(null);
  const isEmailingData = useRef(false);

  async function handleEmailData() {
    if (isEmailingData.current) {
      return;
    }
    isEmailingData.current = true;

    setEmailExportStatus("sending");
    setEmailExportError(null);

    try {
      const data = await collectMyData();
      await emailMyDataExport(data);
      setEmailExportStatus("sent");
    } catch (err) {
      setEmailExportError(getErrorMessage(err));
      setEmailExportStatus("error");
    } finally {
      isEmailingData.current = false;
    }
  }

  async function handleSavePrivacy() {
    if (isSavingPrivacy.current) {
      return;
    }
    isSavingPrivacy.current = true;

    setPrivacySaveStatus("saving");
    setPrivacySaveError(null);

    try {
      await updatePrivacySettings({
        profile_visibility: profileVisibility,
        follow_policy: followPolicy,
        progress_visibility: progressVisibility,
        plant_sitter_attribution: plantSitterAttribution,
      });
      setPrivacySaveStatus("saved");
    } catch (err) {
      setPrivacySaveError(getErrorMessage(err));
      setPrivacySaveStatus("error");
    } finally {
      isSavingPrivacy.current = false;
    }
  }

  async function handleTogglePush(value: "on" | "off") {
    if (isTogglingPush.current) {
      return;
    }
    isTogglingPush.current = true;
    setPushError(null);

    try {
      // Returns the state that actually took effect -- enabling asks
      // for notification permission first, and a denial leaves it off.
      const enabled = await setPushEnabled(value === "on");
      setPushOn(enabled);

      if (value === "on" && !enabled) {
        setPushError(t("settings.notifications.push.permissionDeniedError"));
      }
    } catch (err) {
      setPushError(getErrorMessage(err));
    } finally {
      isTogglingPush.current = false;
    }
  }

  async function handleSaveNotifications() {
    if (!notificationPrefs || isSavingNotifications.current) {
      return;
    }
    isSavingNotifications.current = true;

    setNotifSaveStatus("saving");
    setNotifSaveError(null);

    try {
      await updateNotificationSettings(notificationPrefs);
      setNotifSaveStatus("saved");
    } catch (err) {
      setNotifSaveError(getErrorMessage(err));
      setNotifSaveStatus("error");
    } finally {
      isSavingNotifications.current = false;
    }
  }

  async function handleSaveBadges() {
    if (!badgeSettings || isSavingBadges.current) {
      return;
    }
    isSavingBadges.current = true;

    setBadgeSaveStatus("saving");
    setBadgeSaveError(null);

    try {
      await updateBadgeSettings(badgeSettings);
      setBadgeSaveStatus("saved");
    } catch (err) {
      setBadgeSaveError(getErrorMessage(err));
      setBadgeSaveStatus("error");
    } finally {
      isSavingBadges.current = false;
    }
  }

  const canSendEmailCode = newEmail.trim().length > 0 && emailCodeStatus !== "sending";

  async function handleSendEmailChangeCode() {
    if (!canSendEmailCode || isSendingEmailCode.current) {
      return;
    }
    isSendingEmailCode.current = true;

    setEmailCodeStatus("sending");
    setEmailCodeError(null);

    try {
      await requestCurrentEmailConfirmationCode();
      setEmailCodeStatus("sent");
    } catch (err) {
      setEmailCodeError(getErrorMessage(err));
      setEmailCodeStatus("error");
    } finally {
      isSendingEmailCode.current = false;
    }
  }

  async function handleChangeEmail() {
    if (isChangingEmail.current) {
      return;
    }
    isChangingEmail.current = true;

    setEmailChangeStatus("changing");
    setEmailChangeError(null);

    try {
      await verifyCurrentEmailConfirmationCode(emailCode);
      await changeAccountEmail(newEmail.trim());
      setEmailChangeStatus("changed");
      setEmailCodeStatus("idle");
      setEmailCode("");
    } catch (err) {
      setEmailChangeError(getErrorMessage(err));
      setEmailChangeStatus("error");
    } finally {
      isChangingEmail.current = false;
    }
  }

  async function handleSendGoogleLinkCode() {
    if (isSendingGoogleLinkCode.current) {
      return;
    }
    isSendingGoogleLinkCode.current = true;

    setGoogleLinkCodeStatus("sending");
    setGoogleLinkCodeError(null);

    try {
      await requestCurrentEmailConfirmationCode();
      setGoogleLinkCodeStatus("sent");
    } catch (err) {
      setGoogleLinkCodeError(getErrorMessage(err));
      setGoogleLinkCodeStatus("error");
    } finally {
      isSendingGoogleLinkCode.current = false;
    }
  }

  // linkGoogleAccount() redirects away on success, so there's no "linked"
  // state to set here -- completePendingGoogleLinkSync() (in
  // fetchPrivacySettings) picks up the result once the redirect returns.
  async function handleLinkGoogle() {
    if (isLinkingGoogle.current) {
      return;
    }
    isLinkingGoogle.current = true;

    setGoogleLinkStatus("linking");
    setGoogleLinkError(null);

    try {
      await verifyCurrentEmailConfirmationCode(googleLinkCode);
      await linkGoogleAccount();
    } catch (err) {
      setGoogleLinkError(getErrorMessage(err));
      setGoogleLinkStatus("error");
    } finally {
      isLinkingGoogle.current = false;
    }
  }

  async function handleUnlinkGoogle() {
    setUnlinkGoogleStatus("unlinking");
    setUnlinkGoogleError(null);

    try {
      await unlinkGoogleIdentity();
      setGoogleLinkedEmail(null);
      setShowUnlinkGoogleConfirm(false);
      setUnlinkGoogleStatus("idle");
    } catch (err) {
      setUnlinkGoogleError(getErrorMessage(err));
      setUnlinkGoogleStatus("error");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: t("settings.screenTitle") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.appearance.sectionTitle")}
        </Text>
        <ChipGroup
          fonts={fonts}
          value={themePreference}
          onChange={setThemePreference}
          options={[
            { value: "system", label: t("settings.appearance.options.system") },
            { value: "light", label: t("settings.appearance.options.light") },
            { value: "dark", label: t("settings.appearance.options.dark") },
          ]}
        />
        <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("settings.appearance.hint")}
        </Text>

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.language.sectionTitle")}
        </Text>
        <ChipGroup
          fonts={fonts}
          value={languagePreference}
          onChange={setLanguagePreference}
          options={[
            { value: "system", label: t("settings.language.options.system") },
            { value: "en", label: t("settings.language.options.en") },
            { value: "pt-PT", label: t("settings.language.options.ptPT") },
          ]}
        />
        <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("settings.language.hint")}
        </Text>

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.changePassword.sectionTitle")}
        </Text>

        {hasPassword === false ? (
          <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            {t("settings.changePassword.googleOnlyHint")}
          </Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.changePassword.currentPassword.label")}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.inkSoft}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.changePassword.newPassword.label")}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.inkSoft}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.changePassword.confirmPassword.label")}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.inkSoft}
                secureTextEntry
              />
              {confirmPassword.length > 0 && !passwordsMatch ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                  {t("settings.changePassword.confirmPassword.mismatchError")}
                </Text>
              ) : null}
            </View>

            {saveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
            ) : null}
            {saveStatus === "saved" ? (
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("settings.changePassword.savedText")}
              </Text>
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
                  {t("settings.changePassword.saveButton")}
                </Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.emailLinkedAccounts.sectionTitle")}
        </Text>

        {googleSyncBanner ? (
          <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {googleSyncBanner}
          </Text>
        ) : null}

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("settings.emailLinkedAccounts.currentEmail", { email: accountEmail ?? "—" })}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("settings.emailLinkedAccounts.newEmail.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder={t("settings.emailLinkedAccounts.newEmail.placeholder")}
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        {emailCodeStatus === "sent" ? (
          <>
            <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
              {t("settings.emailLinkedAccounts.codeSent", { email: accountEmail ?? t("settings.emailLinkedAccounts.newEmail.label") })}
            </Text>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.emailLinkedAccounts.confirmationCode.label")}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={emailCode}
                onChangeText={setEmailCode}
                placeholder="123456"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailChangeStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {emailChangeError}
              </Text>
            ) : null}
            {emailChangeStatus === "changed" ? (
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("settings.emailLinkedAccounts.emailChanged", { newEmail })}
              </Text>
            ) : null}
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: newEmail.trim().length > 0 && emailCode.trim().length > 0 ? colors.moss : colors.line },
              ]}
              onPress={handleChangeEmail}
              disabled={newEmail.trim().length === 0 || emailCode.trim().length === 0 || emailChangeStatus === "changing"}
            >
              {emailChangeStatus === "changing" ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                  {t("settings.emailLinkedAccounts.confirmChangeButton")}
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {emailCodeStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {emailCodeError}
              </Text>
            ) : null}
            <Pressable
              style={[styles.dangerOutlineButton, { borderColor: colors.moss }]}
              onPress={handleSendEmailChangeCode}
              disabled={!canSendEmailCode}
            >
              {emailCodeStatus === "sending" ? (
                <ActivityIndicator color={colors.moss} />
              ) : (
                <Text style={[styles.dangerOutlineButtonText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  {t("settings.emailLinkedAccounts.sendCodeButton")}
                </Text>
              )}
            </Pressable>
          </>
        )}

        <View style={[styles.field, styles.linkedAccountsField]}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("settings.emailLinkedAccounts.linkedAccounts.label")}
          </Text>
          {googleLinkedEmail ? (
            <>
              <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                {t("settings.emailLinkedAccounts.linkedAccounts.googleLinked", { email: googleLinkedEmail })}
              </Text>
              {hasPassword ? (
                <Pressable onPress={() => setShowUnlinkGoogleConfirm(true)} hitSlop={4}>
                  <Text style={[styles.policyLink, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                    {t("settings.emailLinkedAccounts.linkedAccounts.unlinkButton")}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : Platform.OS !== "web" ? (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              {t("settings.emailLinkedAccounts.linkedAccounts.webOnlyHint")}
            </Text>
          ) : googleLinkCodeStatus === "sent" ? (
            <>
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("settings.emailLinkedAccounts.codeSent", { email: accountEmail ?? t("settings.emailLinkedAccounts.newEmail.label") })}
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={googleLinkCode}
                onChangeText={setGoogleLinkCode}
                placeholder="123456"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {googleLinkStatus === "error" ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                  {googleLinkError}
                </Text>
              ) : null}
              <Pressable
                style={[styles.saveButton, { backgroundColor: googleLinkCode.trim().length > 0 ? colors.moss : colors.line }]}
                onPress={handleLinkGoogle}
                disabled={googleLinkCode.trim().length === 0 || googleLinkStatus === "linking"}
              >
                {googleLinkStatus === "linking" ? (
                  <ActivityIndicator color={colors.paper} />
                ) : (
                  <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                    {t("settings.emailLinkedAccounts.linkedAccounts.confirmLinkButton")}
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {googleLinkCodeStatus === "error" ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                  {googleLinkCodeError}
                </Text>
              ) : null}
              <Pressable
                style={[styles.dangerOutlineButton, { borderColor: colors.moss }]}
                onPress={handleSendGoogleLinkCode}
                disabled={googleLinkCodeStatus === "sending"}
              >
                {googleLinkCodeStatus === "sending" ? (
                  <ActivityIndicator color={colors.moss} />
                ) : (
                  <Text style={[styles.dangerOutlineButtonText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                    {t("settings.emailLinkedAccounts.sendCodeButton")}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.privacy.sectionTitle")}
        </Text>

        <Pressable onPress={() => router.push("/privacy-policy")} hitSlop={4}>
          <Text style={[styles.policyLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {t("settings.privacy.readPolicyLink")}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/blocked-users")} hitSlop={4}>
          <Text style={[styles.policyLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {t("settings.privacy.blockedUsersLink")}
          </Text>
        </Pressable>

        {privacyStatus === "loading" ? (
          <ActivityIndicator color={colors.moss} />
        ) : privacyStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{privacyError}</Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.privacy.profileVisibility.label")}
              </Text>
              <ChipGroup
                fonts={fonts}
                value={profileVisibility}
                onChange={setProfileVisibility}
                options={[
                  { value: "public", label: t("settings.privacy.profileVisibility.options.public") },
                  { value: "private", label: t("settings.privacy.profileVisibility.options.private") },
                ]}
              />
              <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                {t("settings.privacy.profileVisibility.hint")}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.privacy.followRequests.label")}
              </Text>
              <ChipGroup
                fonts={fonts}
                value={followPolicy}
                onChange={setFollowPolicy}
                options={[
                  { value: "open", label: t("settings.privacy.followRequests.options.open") },
                  { value: "request", label: t("settings.privacy.followRequests.options.request") },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.privacy.progressReports.label")}
              </Text>
              <ChipGroup
                fonts={fonts}
                value={progressVisibility}
                onChange={setProgressVisibility}
                options={[
                  { value: "public", label: t("settings.privacy.progressReports.options.public") },
                  { value: "private", label: t("settings.privacy.progressReports.options.private") },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                {t("settings.privacy.plantSitters.label")}
              </Text>
              <ChipGroup
                fonts={fonts}
                value={plantSitterAttribution}
                onChange={setPlantSitterAttribution}
                options={[
                  { value: "allowed", label: t("settings.privacy.plantSitters.options.allowed") },
                  { value: "disabled", label: t("settings.privacy.plantSitters.options.disabled") },
                ]}
              />
              <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                {t("settings.privacy.plantSitters.hint")}
              </Text>
            </View>

            {privacySaveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {privacySaveError}
              </Text>
            ) : null}
            {privacySaveStatus === "saved" ? (
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("settings.privacy.savedText")}
              </Text>
            ) : null}

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.moss }]}
              onPress={handleSavePrivacy}
              disabled={privacySaveStatus === "saving"}
            >
              {privacySaveStatus === "saving" ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                  {t("settings.privacy.saveButton")}
                </Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.notifications.sectionTitle")}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("settings.notifications.push.label")}
          </Text>
          {Platform.OS === "web" ? (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              {t("settings.notifications.push.webHint")}
            </Text>
          ) : pushOn === null ? (
            <ActivityIndicator color={colors.moss} />
          ) : (
            <>
              <ChipGroup
                fonts={fonts}
                value={pushOn ? "on" : "off"}
                onChange={handleTogglePush}
                options={[
                  { value: "on", label: t("settings.notifications.push.options.on") },
                  { value: "off", label: t("settings.notifications.push.options.off") },
                ]}
              />
              <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                {t("settings.notifications.push.hint")}
              </Text>
              {pushError ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                  {pushError}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("settings.notifications.sectionIntro")}
        </Text>

        {privacyStatus === "loading" ? (
          <ActivityIndicator color={colors.moss} />
        ) : privacyStatus === "error" || !notificationPrefs ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{privacyError}</Text>
        ) : (
          <>
            {NOTIFICATION_PREF_ROWS.map(({ key, labelKey }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  {t(labelKey)}
                </Text>
                <ChipGroup
                  fonts={fonts}
                  value={notificationPrefs[key] ? "on" : "off"}
                  onChange={(value) =>
                    setNotificationPrefs((prefs) => (prefs ? { ...prefs, [key]: value === "on" } : prefs))
                  }
                  options={[
                    { value: "on", label: t("settings.notifications.prefOptions.on") },
                    { value: "off", label: t("settings.notifications.prefOptions.off") },
                  ]}
                />
              </View>
            ))}

            {notifSaveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {notifSaveError}
              </Text>
            ) : null}
            {notifSaveStatus === "saved" ? (
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                {t("settings.notifications.savedText")}
              </Text>
            ) : null}

            <Pressable
              style={[styles.saveButton, { backgroundColor: colors.moss }]}
              onPress={handleSaveNotifications}
              disabled={notifSaveStatus === "saving"}
            >
              {notifSaveStatus === "saving" ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                  {t("settings.notifications.saveButton")}
                </Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.support.sectionTitle")}
        </Text>

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("settings.support.sectionIntro")}
        </Text>

        <Pressable style={[styles.saveButton, { backgroundColor: colors.moss }]} onPress={() => setShowSupportHint(true)}>
          <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
            {t("settings.support.button")}
          </Text>
        </Pressable>

        {(() => {
          const eligibleBadgeRows = BADGE_TOGGLE_ROWS.filter((row) => row.isEligible({ supporterTier, isBetaTester }));
          if (eligibleBadgeRows.length === 0 || !badgeSettings) {
            return null;
          }
          return (
            <>
              <Text
                style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}
              >
                {t("settings.badges.sectionTitle")}
              </Text>
              <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                {t("settings.badges.sectionIntro")}
              </Text>

              {eligibleBadgeRows.map(({ key, labelKey, descKey }) => (
                <View key={key} style={styles.field}>
                  <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>{t(labelKey)}</Text>
                  <ChipGroup
                    fonts={fonts}
                    value={badgeSettings[key] ? "on" : "off"}
                    onChange={(value) =>
                      setBadgeSettings((settings) => (settings ? { ...settings, [key]: value === "on" } : settings))
                    }
                    options={[
                      { value: "on", label: t("settings.notifications.prefOptions.on") },
                      { value: "off", label: t("settings.notifications.prefOptions.off") },
                    ]}
                  />
                  <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>{t(descKey)}</Text>
                </View>
              ))}

              {badgeSaveStatus === "error" ? (
                <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{badgeSaveError}</Text>
              ) : null}
              {badgeSaveStatus === "saved" ? (
                <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  {t("settings.badges.savedText")}
                </Text>
              ) : null}

              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.moss }]}
                onPress={handleSaveBadges}
                disabled={badgeSaveStatus === "saving"}
              >
                {badgeSaveStatus === "saving" ? (
                  <ActivityIndicator color={colors.paper} />
                ) : (
                  <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                    {t("settings.badges.saveButton")}
                  </Text>
                )}
              </Pressable>
            </>
          );
        })()}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          {t("settings.yourData.sectionTitle")}
        </Text>

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          {t("settings.yourData.sectionIntro")}
        </Text>

        {exportStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{exportError}</Text>
        ) : null}
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.moss }]}
          onPress={handleDownloadData}
          disabled={exportStatus === "exporting"}
        >
          {exportStatus === "exporting" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {t("settings.yourData.downloadButton")}
            </Text>
          )}
        </Pressable>

        {emailExportStatus === "sent" ? (
          <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {t("settings.yourData.emailSent", { email: accountEmail ?? "—" })}
          </Text>
        ) : null}
        {emailExportStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{emailExportError}</Text>
        ) : null}
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.line }]}
          onPress={handleEmailData}
          disabled={emailExportStatus === "sending"}
        >
          {emailExportStatus === "sending" ? (
            <ActivityIndicator color={colors.moss} />
          ) : (
            <Text style={[styles.secondaryButtonText, { fontFamily: fonts.bodySemiBold, color: colors.moss }]}>
              {t("settings.yourData.emailButton")}
            </Text>
          )}
        </Pressable>

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.coral }]}>
          {t("settings.dangerZone.sectionTitle")}
        </Text>

        <AccountDeletionFlow fonts={fonts} />
      </ScrollView>

      {showSupportHint ? (
        <SupportHintModal
          fonts={fonts}
          onCancel={() => setShowSupportHint(false)}
          onContinue={() => {
            setShowSupportHint(false);
            handleOpenSupportLink();
          }}
        />
      ) : null}

      {showUnlinkGoogleConfirm ? (
        <ConfirmModal
          message={t("settings.emailLinkedAccounts.linkedAccounts.confirmUnlink.message", {
            email: googleLinkedEmail ?? "",
          })}
          actions={[
            {
              label: t("settings.emailLinkedAccounts.linkedAccounts.confirmUnlink.confirmButton"),
              tone: "destructive",
              onPress: handleUnlinkGoogle,
            },
          ]}
          onCancel={() => {
            setShowUnlinkGoogleConfirm(false);
            setUnlinkGoogleError(null);
          }}
          busy={unlinkGoogleStatus === "unlinking"}
          errorText={unlinkGoogleError}
          fonts={fonts}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
  },
  privacySectionTitle: {
    marginTop: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
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
  savedText: {
    fontSize: 13,
  },
  saveButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  policyLink: {
    fontSize: 14,
  },
  sectionIntro: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  dangerOutlineButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerOutlineButtonText: {
    fontSize: 14,
  },
  confirmBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  confirmAction: {
    fontSize: 14,
  },
  linkedAccountsField: {
    marginTop: spacing.sm,
  },
});
