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
import {
  accountHasPassword,
  changeAccountEmail,
  completePendingGoogleLinkSync,
  confirmAccountDeletion,
  confirmPasswordlessAccountDeletion,
  getLinkedGoogleEmail,
  linkGoogleAccount,
  requestAccountDeletionCode,
  requestCurrentEmailConfirmationCode,
  updatePasswordWithReauth,
  verifyCurrentEmailConfirmationCode,
} from "../lib/supabase/auth";
import { collectMyData } from "../lib/supabase/gdpr";
import {
  getMyProfile,
  updateNotificationSettings,
  updatePrivacySettings,
  type FollowPolicy,
  type NotificationSettings,
  type PlantSitterAttribution,
  type ProfileVisibility,
  type ProgressVisibility,
} from "../lib/supabase/profiles";
import { getErrorMessage } from "../lib/errors";
import { ChipGroup } from "../components/ChipGroup";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";

// One On/Off row per notification kind, in inbox-relevance order.
const NOTIFICATION_PREF_ROWS: { key: keyof NotificationSettings; label: string }[] = [
  { key: "notify_comments", label: "Comments" },
  { key: "notify_likes", label: "Likes" },
  { key: "notify_follow_requests", label: "Follow requests" },
  { key: "notify_new_followers", label: "New followers" },
  { key: "notify_follow_accepted", label: "Follow request accepted" },
  { key: "notify_sitting_requests", label: "Plant-sitting requests" },
  { key: "notify_sitting_responses", label: "Plant-sitting responses" },
];

export default function SettingsScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors, themePreference, setThemePreference } = useTheme();

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

  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);

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
          notify_comments: profile.notify_comments,
          notify_likes: profile.notify_likes,
          notify_follow_requests: profile.notify_follow_requests,
          notify_new_followers: profile.notify_new_followers,
          notify_follow_accepted: profile.notify_follow_accepted,
          notify_sitting_requests: profile.notify_sitting_requests,
          notify_sitting_responses: profile.notify_sitting_responses,
        });
        setAccountEmail(profile.email);
        setAccountUsername(profile.username);
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

    // If linkGoogleAccount() redirected away and just landed back here,
    // this picks up where it left off -- see completePendingGoogleLinkSync().
    completePendingGoogleLinkSync()
      .then((syncedEmail) => {
        if (syncedEmail) {
          setGoogleSyncBanner(
            `Google account linked — check ${syncedEmail} for a confirmation link to finish switching your account email.`
          );
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
      // Web-only download mechanism -- the button is gated on
      // Platform.OS === "web" below; native file sharing is a tracked
      // backlog item.
      const doc = (globalThis as unknown as { document: Document }).document;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = doc.createElement("a");
      anchor.href = url;
      anchor.download = `greenie-data-${new Date().toISOString().slice(0, 10)}.json`;
      doc.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportStatus("idle");
    } catch (err) {
      setExportError(getErrorMessage(err));
      setExportStatus("error");
    } finally {
      isExporting.current = false;
    }
  }

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteUsername, setDeleteUsername] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isSendingCode = useRef(false);
  const isDeleting = useRef(false);

  async function handleSendDeletionCode() {
    if (isSendingCode.current) {
      return;
    }
    isSendingCode.current = true;

    setCodeStatus("sending");
    setCodeError(null);

    try {
      await requestAccountDeletionCode();
      setCodeStatus("sent");
    } catch (err) {
      setCodeError(getErrorMessage(err));
      setCodeStatus("error");
    } finally {
      isSendingCode.current = false;
    }
  }

  async function handleDeleteAccount() {
    if (isDeleting.current) {
      return;
    }
    isDeleting.current = true;

    setConfirmingDelete(false);
    setDeleteStatus("deleting");
    setDeleteError(null);

    try {
      if (hasPassword === false) {
        await confirmPasswordlessAccountDeletion(deleteCode);
      } else {
        await confirmAccountDeletion(deletePassword, deleteCode);
      }
      // No navigation needed -- the root layout's onAuthStateChange
      // listener swaps to the sign-in stack once the session clears.
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleteStatus("error");
    } finally {
      isDeleting.current = false;
    }
  }

  // For passwordless (Google-only) accounts the typed username replaces
  // the password field -- a deliberateness check, while the emailed code
  // stays the actual proof it's the account owner.
  const typedUsernameMatches =
    accountUsername !== null && deleteUsername.trim().replace(/^@/, "").toLowerCase() === accountUsername;

  const canDelete =
    (hasPassword === false ? typedUsernameMatches : deletePassword.length > 0) &&
    deleteCode.trim().length > 0 &&
    deleteStatus !== "deleting";

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Appearance
        </Text>
        <ChipGroup
          fonts={fonts}
          value={themePreference}
          onChange={setThemePreference}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          System matches your device's setting.
        </Text>

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Change password
        </Text>

        {hasPassword === false ? (
          <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            You sign in with Google — this account has no password.
          </Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                Current password
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
                New password (min. 6 characters)
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
                Confirm new password
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
                  Passwords don't match
                </Text>
              ) : null}
            </View>

            {saveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
            ) : null}
            {saveStatus === "saved" ? (
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Password updated
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
                  Save
                </Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Email &amp; linked accounts
        </Text>

        {googleSyncBanner ? (
          <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {googleSyncBanner}
          </Text>
        ) : null}

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          Current email: {accountEmail ?? "—"}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>New email</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        {emailCodeStatus === "sent" ? (
          <>
            <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
              Code sent to {accountEmail ?? "your email"}
            </Text>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                Confirmation code
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
                Check {newEmail} for a confirmation link to finish the change.
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
                  Confirm &amp; change email
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
                  Send code to current email
                </Text>
              )}
            </Pressable>
          </>
        )}

        <View style={[styles.field, styles.linkedAccountsField]}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            Linked accounts
          </Text>
          {googleLinkedEmail ? (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              Google account linked ({googleLinkedEmail}).
            </Text>
          ) : Platform.OS !== "web" ? (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              Linking a Google account is available on the web for now.
            </Text>
          ) : googleLinkCodeStatus === "sent" ? (
            <>
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Code sent to {accountEmail ?? "your email"}
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
                    Confirm &amp; link Google account
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
                    Send code to current email
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Privacy
        </Text>

        <Pressable onPress={() => router.push("/privacy-policy")} hitSlop={4}>
          <Text style={[styles.policyLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            Read the Privacy Policy
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/blocked-users")} hitSlop={4}>
          <Text style={[styles.policyLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            Blocked users
          </Text>
        </Pressable>

        {privacyStatus === "loading" ? (
          <ActivityIndicator color={colors.moss} />
        ) : privacyStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{privacyError}</Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Profile</Text>
              <ChipGroup
                fonts={fonts}
                value={profileVisibility}
                onChange={setProfileVisibility}
                options={[
                  { value: "public", label: "Public" },
                  { value: "private", label: "Private" },
                ]}
              />
              <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                Private shows only your name, avatar, and bio to people who don't follow you.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                Follow requests
              </Text>
              <ChipGroup
                fonts={fonts}
                value={followPolicy}
                onChange={setFollowPolicy}
                options={[
                  { value: "open", label: "Anyone can follow" },
                  { value: "request", label: "Require approval" },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                Progress reports
              </Text>
              <ChipGroup
                fonts={fonts}
                value={progressVisibility}
                onChange={setProgressVisibility}
                options={[
                  { value: "public", label: "Public" },
                  { value: "private", label: "Followers only" },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                Plant-sitters
              </Text>
              <ChipGroup
                fonts={fonts}
                value={plantSitterAttribution}
                onChange={setPlantSitterAttribution}
                options={[
                  { value: "allowed", label: "Allow sharing to their feed" },
                  { value: "disabled", label: "Keep in plant history only" },
                ]}
              />
              <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
                When a plant-sitter logs a progress report on one of your plants, this controls whether
                they can share it to their own feed. Off: their reports stay in this plant's own
                history only.
              </Text>
            </View>

            {privacySaveStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>
                {privacySaveError}
              </Text>
            ) : null}
            {privacySaveStatus === "saved" ? (
              <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                Privacy settings saved
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
                  Save privacy settings
                </Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Notifications
        </Text>

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          Choose what shows up in your notifications. Anything turned off is never created — not just
          hidden.
        </Text>

        {privacyStatus === "loading" ? (
          <ActivityIndicator color={colors.moss} />
        ) : privacyStatus === "error" || !notificationPrefs ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{privacyError}</Text>
        ) : (
          <>
            {NOTIFICATION_PREF_ROWS.map(({ key, label }) => (
              <View key={key} style={styles.field}>
                <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  {label}
                </Text>
                <ChipGroup
                  fonts={fonts}
                  value={notificationPrefs[key] ? "on" : "off"}
                  onChange={(value) =>
                    setNotificationPrefs((prefs) => (prefs ? { ...prefs, [key]: value === "on" } : prefs))
                  }
                  options={[
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
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
                Notification settings saved
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
                  Save notification settings
                </Text>
              )}
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Your data
        </Text>

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          Download everything Greenie stores about you — your account, plants, care schedules, progress
          reports, comments, likes, and follows — as a JSON file.
        </Text>

        {Platform.OS === "web" ? (
          <>
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
                  Download my data
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
            Data download is available on the web version for now.
          </Text>
        )}

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.coral }]}>
          Danger zone
        </Text>

        <Text style={[styles.sectionIntro, { fontFamily: fonts.body, color: colors.inkSoft }]}>
          Deleting your account permanently removes your profile, plants, care schedules, progress reports,
          comments, likes, and follows. This cannot be undone.{" "}
          {hasPassword === false
            ? "To confirm it's really you, type your username and enter a confirmation code sent to your email."
            : "To confirm it's really you, enter your password and a confirmation code sent to your email."}
        </Text>

        {hasPassword === false ? (
          <View style={styles.field}>
            <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
              Type @{accountUsername ?? "your username"} to confirm
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
              value={deleteUsername}
              onChangeText={setDeleteUsername}
              placeholder={accountUsername ? `@${accountUsername}` : "@username"}
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Password</Text>
            <TextInput
              style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="••••••••"
              placeholderTextColor={colors.inkSoft}
              secureTextEntry
            />
          </View>
        )}

        {codeStatus === "sent" ? (
          <>
            <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
              Code sent to {accountEmail ?? "your email"}
            </Text>
            <View style={styles.field}>
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                Confirmation code
              </Text>
              <TextInput
                style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
                value={deleteCode}
                onChangeText={setDeleteCode}
                placeholder="123456"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>
        ) : (
          <>
            {codeStatus === "error" ? (
              <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{codeError}</Text>
            ) : null}
            <Pressable
              style={[styles.dangerOutlineButton, { borderColor: colors.coral }]}
              onPress={handleSendDeletionCode}
              disabled={codeStatus === "sending"}
            >
              {codeStatus === "sending" ? (
                <ActivityIndicator color={colors.coral} />
              ) : (
                <Text style={[styles.dangerOutlineButtonText, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                  Email me a confirmation code
                </Text>
              )}
            </Pressable>
          </>
        )}

        {deleteStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{deleteError}</Text>
        ) : null}

        {codeStatus === "sent" ? (
          confirmingDelete ? (
            <View style={[styles.confirmBox, { borderColor: colors.coral, backgroundColor: colors.coralSoft }]}>
              <Text style={[styles.confirmText, { fontFamily: fonts.body, color: colors.ink }]}>
                Last chance — this permanently erases your account and everything in it.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable onPress={handleDeleteAccount} hitSlop={8}>
                  <Text style={[styles.confirmAction, { fontFamily: fonts.bodySemiBold, color: colors.coral }]}>
                    Delete everything
                  </Text>
                </Pressable>
                <Pressable onPress={() => setConfirmingDelete(false)} hitSlop={8}>
                  <Text style={[styles.confirmAction, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.saveButton, { backgroundColor: canDelete ? colors.coral : colors.line }]}
              onPress={() => setConfirmingDelete(true)}
              disabled={!canDelete}
            >
              {deleteStatus === "deleting" ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                  Permanently delete my account
                </Text>
              )}
            </Pressable>
          )
        ) : null}
      </ScrollView>
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
