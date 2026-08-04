import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { t as translate, type SupportedLocale } from "../lib/i18n";
import { fontAssets, getFonts, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

// Content lives in lib/i18n/en.ts and pt-PT.ts under the termsOfUse
// namespace. Structurally identical to app/privacy-policy.tsx -- same
// page-local language toggle (doesn't touch the app-wide
// languagePreference), same section-map rendering.

const SECTION_KEYS = [
  "acceptance",
  "account",
  "userContent",
  "moderation",
  "aiFeatures",
  "thirdParty",
  "disclaimers",
  "termination",
  "changes",
  "governingLaw",
  "contact",
] as const;

const LOCALE_OPTIONS: { value: SupportedLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt-PT", label: "Português" },
];

export default function TermsOfUseScreen() {
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
      <Stack.Screen options={{ title: t("termsOfUse.screenTitle") }} />

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

      <Text style={[styles.lastUpdated, { fontFamily: fonts.body, color: colors.inkSoft }]}>
        {t("termsOfUse.lastUpdated")}
      </Text>

      {SECTION_KEYS.map((key) => (
        <View key={key} style={styles.section}>
          <Text style={[styles.heading, { fontFamily: fonts.display, color: colors.ink }]}>
            {t(`termsOfUse.sections.${key}.heading`)}
          </Text>
          <Text style={[styles.body, { fontFamily: fonts.body, color: colors.ink }]}>
            {t(`termsOfUse.sections.${key}.body`)}
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
