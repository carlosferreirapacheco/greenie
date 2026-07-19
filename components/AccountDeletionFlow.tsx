import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  accountHasPassword,
  confirmAccountDeletion,
  confirmPasswordlessAccountDeletion,
  requestAccountDeletionCode,
} from "../lib/supabase/auth";
import { getMyProfile } from "../lib/supabase/profiles";
import { getErrorMessage } from "../lib/errors";
import { getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";

// The two-factor account-deletion flow, extracted from app/settings.tsx
// so both Settings and the public app/delete-account.tsx page render the
// same logic instead of duplicating it. Self-contained: fetches its own
// hasPassword/username/email rather than taking them as props, since
// Settings already keeps its own copies for other sections (Change
// password, Email & linked accounts) and this needs to work standalone
// on the public page too. `fonts` is still taken as a prop, matching
// ChipGroup/PhotoPicker -- the parent screen has already loaded them.
export function AccountDeletionFlow({
  fonts,
  onDeleted,
}: {
  fonts: ReturnType<typeof getFonts>;
  onDeleted?: () => void;
}) {
  const { colors } = useTheme();

  // null = not resolved yet, which keeps the regular password UI --
  // also the fallback if the identities lookup fails.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    accountHasPassword()
      .then(setHasPassword)
      .catch(() => setHasPassword(null));

    getMyProfile()
      .then((profile) => {
        setAccountUsername(profile.username);
        setAccountEmail(profile.email);
      })
      .catch(() => {
        // Non-critical -- only used for placeholder/confirmation copy.
      });
  }, []);

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
      onDeleted?.();
      // Settings has no onDeleted -- the root layout's onAuthStateChange
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

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
