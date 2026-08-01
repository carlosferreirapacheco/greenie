import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { t as translate, type SupportedLocale } from "../lib/i18n";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

// DRAFT: needs proper (legal) review before the app has real users --
// tracked in the CLAUDE.md backlog. Content lives in lib/i18n/en.ts and
// pt-PT.ts under the privacyPolicy namespace.

const SECTION_KEYS = ["whatWeStore", "whereItLives", "whatLeavesTheApp", "whatWeDontDo", "yourRights", "consent"] as const;

// This screen is public/pre-auth, so it doesn't just follow the app's
// account-wide language setting -- a first-time visitor may want to read
// the policy in a specific language regardless of their device locale.
// The toggle below starts from the app's currently resolved locale but
// overrides it locally for this screen only; it never writes back to the
// app-wide languagePreference.
const LOCALE_OPTIONS: { value: SupportedLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt-PT", label: "Português" },
];

export default function PrivacyPolicyScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { locale: appLocale } = useLanguage();
  const [locale, setLocale] = useState<SupportedLocale>(appLocale);

  function t(key: string): string {
    return translate(locale, key);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t("privacyPolicy.screenTitle") }} />

      <View style={styles.languageToggle}>
        {LOCALE_OPTIONS.map((option) => {
          const active = option.value === locale;
          return (
            <Pressable key={option.value} onPress={() => setLocale(option.value)} hitSlop={8}>
              <Text
                style={[
                  styles.languageToggleLabel,
                  {
                    fontFamily: active ? fonts.bodySemiBold : fonts.body,
                    color: active ? colors.moss : colors.inkSoft,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.draftBanner, { backgroundColor: colors.sage }]}>
        <Text style={[styles.draftText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
          {t("privacyPolicy.draftBanner")}
        </Text>
      </View>

      <Text style={[styles.lastUpdated, { fontFamily: fonts.body, color: colors.inkSoft }]}>
        {t("privacyPolicy.lastUpdated")}
      </Text>

      {SECTION_KEYS.map((key) => (
        <View key={key} style={styles.section}>
          <Text style={[styles.heading, { fontFamily: fonts.display, color: colors.ink }]}>
            {t(`privacyPolicy.sections.${key}.heading`)}
          </Text>
          <Text style={[styles.body, { fontFamily: fonts.body, color: colors.ink }]}>
            {t(`privacyPolicy.sections.${key}.body`)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  languageToggle: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  languageToggleLabel: {
    fontSize: 13,
  },
  draftBanner: {
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  draftText: {
    fontSize: 13,
  },
  lastUpdated: {
    fontSize: 12,
  },
  section: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: 17,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 21,
  },
});
