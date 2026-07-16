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
import { getMyProfile, updateMyAvatar, updateMyProfile, type MyProfile } from "../lib/supabase/profiles";
import {
  getUsernameChangeCooldownDays,
  nextUsernameChangeDate,
  normalizeUsername,
  validateUsername,
} from "../lib/supabase/usernames";
import { signOut } from "../lib/supabase/auth";
import { unregisterPushForSignOut } from "../lib/pushNotificationManager";
import { deletePhotoByUrl } from "../lib/supabase/storage";
import { PhotoPicker } from "../components/PhotoPicker";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { getErrorMessage } from "../lib/errors";

const cooldownDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function ProfileScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [cooldownDays, setCooldownDays] = useState(5);
  const [confirmingUsername, setConfirmingUsername] = useState(false);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx: state updates are
  // async, so a ref is needed to reliably block a second rapid tap.
  const isSaving = useRef(false);
  const isSigningOut = useRef(false);
  const [signOutStatus, setSignOutStatus] = useState<"idle" | "signing-out" | "error">("idle");
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const [avatarSaveError, setAvatarSaveError] = useState<string | null>(null);

  const fetchProfile = useCallback(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setUsername(data.username);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setStatus("ready");
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setStatus("error");
      });

    // Drives the confirmation copy and the cooldown hint; the trigger
    // enforces the real value server-side, so a failed fetch just means
    // the UI shows the default.
    getUsernameChangeCooldownDays()
      .then(setCooldownDays)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const normalizedUsername = normalizeUsername(username);
  const usernameChanged = profile !== null && normalizedUsername !== profile.username;
  const usernameError = usernameChanged ? validateUsername(normalizedUsername) : null;
  const nextChange = nextUsernameChangeDate(profile?.username_changed_at ?? null, cooldownDays);

  async function doSave() {
    if (isSaving.current) {
      return;
    }
    isSaving.current = true;

    setConfirmingUsername(false);
    setSaveStatus("saving");
    setSaveError(null);

    try {
      const updated = await updateMyProfile({
        // Unchanged usernames re-send the saved value, which the cooldown
        // trigger ignores (only actual changes count).
        username: usernameChanged ? normalizedUsername : (profile?.username ?? normalizedUsername),
        display_name: displayName.trim().length > 0 ? displayName.trim() : null,
        bio: bio.trim().length > 0 ? bio.trim() : null,
      });
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setUsername(updated.username);
      setSaveStatus("saved");
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  async function handleSave() {
    if (isSaving.current) {
      return;
    }

    if (usernameChanged) {
      if (usernameError) {
        setSaveError(usernameError);
        setSaveStatus("error");
        return;
      }
      if (nextChange) {
        setSaveError(`You can change your username again on ${cooldownDateFormatter.format(nextChange)}`);
        setSaveStatus("error");
        return;
      }
      // Changing the username starts the cooldown -- make sure that's
      // understood before committing (inline confirm; RN Alert is a
      // no-op on web).
      setSaveStatus("idle");
      setSaveError(null);
      setConfirmingUsername(true);
      return;
    }

    await doSave();
  }

  async function handleAvatarChange(url: string) {
    const previousUrl = profile?.avatar_url ?? null;
    setAvatarSaveError(null);

    try {
      const updated = await updateMyAvatar(url);
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      if (previousUrl) {
        await deletePhotoByUrl(previousUrl);
      }
    } catch (err) {
      setAvatarSaveError(getErrorMessage(err));
    }
  }

  async function handleSignOut() {
    if (isSigningOut.current) {
      return;
    }
    isSigningOut.current = true;

    setSignOutStatus("signing-out");
    setSignOutError(null);

    try {
      // Best-effort, while the session is still valid: remove this
      // device's push token so it stops receiving this account's
      // pushes after signing out.
      await unregisterPushForSignOut();
      await signOut();
      // No navigation needed -- app/_layout.tsx's onAuthStateChange
      // listener swaps back to the sign-in stack once the session clears.
    } catch (err) {
      setSignOutError(getErrorMessage(err));
      setSignOutStatus("error");
      isSigningOut.current = false;
    }
  }

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen
          options={{
            title: "Profile",
            headerRight: () => (
              <Pressable onPress={() => router.push("/settings")} hitSlop={8} style={styles.settingsLinkWrap}>
                <Text style={[styles.settingsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  Settings
                </Text>
              </Pressable>
            ),
          }}
        />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen
          options={{
            title: "Profile",
            headerRight: () => (
              <Pressable onPress={() => router.push("/settings")} hitSlop={8} style={styles.settingsLinkWrap}>
                <Text style={[styles.settingsLink, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
                  Settings
                </Text>
              </Pressable>
            ),
          }}
        />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Profile" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <PhotoPicker
          value={profile?.avatar_url ?? null}
          onChange={handleAvatarChange}
          context="avatars"
          size={88}
          photoRadius={radius.lg}
          fonts={fonts}
        />
        {avatarSaveError ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{avatarSaveError}</Text>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Email</Text>
          <Text style={[styles.readonlyValue, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}>
            {profile?.email ?? "—"}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Username</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setConfirmingUsername(false);
            }}
            placeholder="e.g. plant.parent_42"
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameChanged && usernameError ? (
            <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{usernameError}</Text>
          ) : null}
          {nextChange ? (
            <Text style={[styles.hint, { fontFamily: fonts.body, color: colors.inkSoft }]}>
              You can change your username again on {cooldownDateFormatter.format(nextChange)}
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Display name</Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Carlos"
            placeholderTextColor={colors.inkSoft}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Bio</Text>
          <TextInput
            style={[
              styles.input,
              styles.bioInput,
              { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell other plant people about yourself"
            placeholderTextColor={colors.inkSoft}
            multiline
          />
        </View>

        {saveStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{saveError}</Text>
        ) : null}
        {saveStatus === "saved" ? (
          <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Saved</Text>
        ) : null}

        {confirmingUsername ? (
          <View style={[styles.confirmBox, { borderColor: colors.line, backgroundColor: colors.sage }]}>
            <Text style={[styles.confirmText, { fontFamily: fonts.body, color: colors.ink }]}>
              Usernames can only be changed once every {cooldownDays} days. Change it to @{normalizedUsername}?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={doSave} hitSlop={8}>
                <Text style={[styles.confirmAction, { fontFamily: fonts.bodySemiBold, color: colors.mossStrong }]}>
                  Change username
                </Text>
              </Pressable>
              <Pressable onPress={() => setConfirmingUsername(false)} hitSlop={8}>
                <Text style={[styles.confirmAction, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.moss }]}
            onPress={handleSave}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
                Save
              </Text>
            )}
          </Pressable>
        )}

        {signOutStatus === "error" ? (
          <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{signOutError}</Text>
        ) : null}

        <Pressable
          style={[styles.signOutButton, { borderColor: colors.line }]}
          onPress={handleSignOut}
          disabled={signOutStatus === "signing-out"}
        >
          {signOutStatus === "signing-out" ? (
            <ActivityIndicator color={colors.inkSoft} />
          ) : (
            <Text style={[styles.signOutButtonText, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
              Sign out
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    width: "100%",
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
  },
  readonlyValue: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    opacity: 0.7,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
  },
  bioInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 13,
  },
  savedText: {
    fontSize: 13,
  },
  saveButton: {
    width: "100%",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
  },
  signOutButton: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutButtonText: {
    fontSize: 15,
  },
  settingsLinkWrap: {
    marginRight: spacing.md,
  },
  settingsLink: {
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
  },
  confirmBox: {
    width: "100%",
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
