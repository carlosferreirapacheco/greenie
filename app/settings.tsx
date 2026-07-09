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
import { Stack, useFocusEffect } from "expo-router";
import { updatePasswordWithReauth } from "../lib/supabase/auth";
import {
  getMyProfile,
  updatePrivacySettings,
  type CommentPolicy,
  type FollowPolicy,
  type ProfileVisibility,
  type ProgressVisibility,
} from "../lib/supabase/profiles";
import { getErrorMessage } from "../lib/errors";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  fonts,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  fonts: ReturnType<typeof getFonts>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.chip,
            { borderColor: colors.line, backgroundColor: value === option.value ? colors.sage : "transparent" },
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              styles.chipText,
              { fontFamily: fonts.bodyMedium, color: value === option.value ? colors.mossStrong : colors.ink },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

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
  const [commentPolicy, setCommentPolicy] = useState<CommentPolicy>("public");
  const [privacySaveStatus, setPrivacySaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [privacySaveError, setPrivacySaveError] = useState<string | null>(null);
  const isSavingPrivacy = useRef(false);

  const fetchPrivacySettings = useCallback(() => {
    getMyProfile()
      .then((profile) => {
        setProfileVisibility(profile.profile_visibility);
        setFollowPolicy(profile.follow_policy);
        setProgressVisibility(profile.progress_visibility);
        setCommentPolicy(profile.comment_policy);
        setPrivacyStatus("ready");
      })
      .catch((err) => {
        setPrivacyError(getErrorMessage(err));
        setPrivacyStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPrivacySettings();
    }, [fetchPrivacySettings])
  );

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
        comment_policy: commentPolicy,
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

        <Text style={[styles.sectionTitle, styles.privacySectionTitle, { fontFamily: fonts.display, color: colors.ink }]}>
          Privacy
        </Text>

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
              <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Comments</Text>
              <ChipGroup
                fonts={fonts}
                value={commentPolicy}
                onChange={setCommentPolicy}
                options={[
                  { value: "public", label: "Anyone can comment" },
                  { value: "followers", label: "Followers only" },
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
  },
});
