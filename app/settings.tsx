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
  confirmAccountDeletion,
  confirmPasswordlessAccountDeletion,
  requestAccountDeletionCode,
  updatePasswordWithReauth,
} from "../lib/supabase/auth";
import { collectMyData } from "../lib/supabase/gdpr";
import {
  getMyProfile,
  updatePrivacySettings,
  type FollowPolicy,
  type ProfileVisibility,
  type ProgressVisibility,
} from "../lib/supabase/profiles";
import { getErrorMessage } from "../lib/errors";
import { ChipGroup } from "../components/ChipGroup";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";

export default function SettingsScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

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
  const [privacySaveStatus, setPrivacySaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [privacySaveError, setPrivacySaveError] = useState<string | null>(null);
  const isSavingPrivacy = useRef(false);

  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);

  // null = not resolved yet, which keeps the regular password UI -- also
  // the fallback if the identities lookup fails, leaving a passwordless
  // account no worse off than before this check existed.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const fetchPrivacySettings = useCallback(() => {
    getMyProfile()
      .then((profile) => {
        setProfileVisibility(profile.profile_visibility);
        setFollowPolicy(profile.follow_policy);
        setProgressVisibility(profile.progress_visibility);
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
      });
      setPrivacySaveStatus("saved");
    } catch (err) {
      setPrivacySaveError(getErrorMessage(err));
      setPrivacySaveStatus("error");
    } finally {
      isSavingPrivacy.current = false;
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
});
