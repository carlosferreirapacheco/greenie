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
import { getMyProfile, updateMyProfile, type MyProfile } from "../lib/supabase/profiles";
import { colors, fontAssets, getFonts, radius, spacing } from "../lib/theme";

export default function ProfileScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Same synchronous-guard pattern as app/add-plant.tsx: state updates are
  // async, so a ref is needed to reliably block a second rapid tap.
  const isSaving = useRef(false);

  const fetchProfile = useCallback(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setStatus("ready");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  async function handleSave() {
    if (isSaving.current) {
      return;
    }
    isSaving.current = true;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const updated = await updateMyProfile({
        display_name: displayName.trim().length > 0 ? displayName.trim() : null,
        bio: bio.trim().length > 0 ? bio.trim() : null,
      });
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaveStatus("saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaveStatus("error");
    } finally {
      isSaving.current = false;
    }
  }

  const initial = (displayName.trim() || profile?.email || "?").charAt(0).toUpperCase();

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Profile" }} />
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={[styles.center, { backgroundColor: colors.paper }]}>
        <Stack.Screen options={{ title: "Profile" }} />
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
        <View style={[styles.avatar, { backgroundColor: colors.sage }]}>
          <Text style={[styles.avatarText, { fontFamily: fonts.display, color: colors.mossStrong }]}>
            {initial}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>Email</Text>
          <Text style={[styles.readonlyValue, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}>
            {profile?.email ?? "—"}
          </Text>
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
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 34,
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
});
