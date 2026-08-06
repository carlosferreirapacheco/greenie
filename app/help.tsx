import { Fragment } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { splitBold } from "../lib/i18n";
import { fontAssets, getFonts, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

// One entry per help.sections.* key in lib/i18n/en.ts.
const SECTION_KEYS = [
  "gettingStarted",
  "plantsAndCareTasks",
  "aiLookup",
  "progressAndPhotos",
  "notificationsAndStreaks",
  "social",
  "plantSitting",
  "supporterBadges",
  "privacyAndData",
] as const;

export default function HelpScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t("help.screenTitle") }} />

      {SECTION_KEYS.map((key) => {
        const heading = t(`help.sections.${key}.heading`);
        const body = t(`help.sections.${key}.body`);
        return (
          <View key={key} style={styles.section}>
            <Text style={[styles.heading, { fontFamily: fonts.display, color: colors.ink }]}>{heading}</Text>
            <Text style={[styles.body, { fontFamily: fonts.body, color: colors.ink }]}>
              {splitBold(body).map((part, index) =>
                typeof part === "string" ? (
                  <Fragment key={index}>{part}</Fragment>
                ) : (
                  <Text key={index} style={{ fontFamily: fonts.bodySemiBold }}>
                    {part.bold}
                  </Text>
                )
              )}
            </Text>
          </View>
        );
      })}
      <View style={{ height: insets.bottom }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
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
