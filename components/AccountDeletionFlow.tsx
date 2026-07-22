import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  accountHasPassword,
  confirmAccountDeletion,
  confirmPasswordlessAccountDeletion,
  requestAccountDeletionCode,
} from "../lib/supabase/auth";
import { getMyProfile } from "../lib/supabase/profiles";
import { ConfirmModal } from "./ConfirmModal";
import { getErrorMessage } from "../lib/errors";
import { getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

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
  const { t } = useLanguage();

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

    setDeleteStatus("deleting");
    setDeleteError(null);

    try {
      if (hasPassword === false) {
        await confirmPasswordlessAccountDeletion(deleteCode);
      } else {
        await confirmAccountDeletion(deletePassword, deleteCode);
      }
      // Settings has no onDeleted -- the root layout's onAuthStateChange
      // listener swaps to the sign-in stack once the session clears.
      onDeleted?.();
    } catch (err) {
      // Leaves confirmingDelete set -- the modal stays open with the
      // error shown inline instead of silently vanishing.
      setDeleteError(getErrorMessage(err));
      setDeleteStatus("error");
    } finally {
      isDeleting.current = false;
    }
  }

  function handleCancelDeleteConfirm() {
    setConfirmingDelete(false);
    setDeleteStatus("idle");
    setDeleteError(null);
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
        {t("accountDeletionFlow.sectionIntro.base")}{" "}
        {hasPassword === false
          ? t("accountDeletionFlow.sectionIntro.passwordless")
          : t("accountDeletionFlow.sectionIntro.withPassword")}
      </Text>

      {hasPassword === false ? (
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("accountDeletionFlow.usernameConfirm.label", {
              username: accountUsername ?? t("accountDeletionFlow.usernameConfirm.fallbackUsername"),
            })}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={deleteUsername}
            onChangeText={setDeleteUsername}
            placeholder={accountUsername ? `@${accountUsername}` : t("accountDeletionFlow.usernameConfirm.placeholderFallback")}
            placeholderTextColor={colors.inkSoft}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
            {t("signIn.password.label")}
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder={t("signIn.password.placeholder")}
            placeholderTextColor={colors.inkSoft}
            secureTextEntry
          />
        </View>
      )}

      {codeStatus === "sent" ? (
        <>
          <Text style={[styles.savedText, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>
            {t("settings.emailLinkedAccounts.codeSent", {
              email: accountEmail ?? t("accountDeletionFlow.fallbackEmail"),
            })}
          </Text>
          <View style={styles.field}>
            <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
              {t("settings.emailLinkedAccounts.confirmationCode.label")}
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: fonts.body, color: colors.ink, borderColor: colors.line }]}
              value={deleteCode}
              onChangeText={setDeleteCode}
              placeholder={t("accountDeletionFlow.codePlaceholder")}
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
                {t("accountDeletionFlow.sendCodeButton")}
              </Text>
            )}
          </Pressable>
        </>
      )}

      {!confirmingDelete && deleteStatus === "error" ? (
        <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{deleteError}</Text>
      ) : null}

      {codeStatus === "sent" ? (
        <Pressable
          style={[styles.saveButton, { backgroundColor: canDelete ? colors.coral : colors.line }]}
          onPress={() => setConfirmingDelete(true)}
          disabled={!canDelete}
        >
          {deleteStatus === "deleting" ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: fonts.bodySemiBold, color: colors.paper }]}>
              {t("accountDeletionFlow.deleteButton")}
            </Text>
          )}
        </Pressable>
      ) : null}

      {confirmingDelete ? (
        <ConfirmModal
          message={t("accountDeletionFlow.confirmDelete.message")}
          actions={[
            { label: t("accountDeletionFlow.confirmDelete.confirm"), tone: "destructive", onPress: handleDeleteAccount },
          ]}
          onCancel={handleCancelDeleteConfirm}
          busy={deleteStatus === "deleting"}
          errorText={deleteStatus === "error" ? deleteError : null}
          fonts={fonts}
        />
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
});
