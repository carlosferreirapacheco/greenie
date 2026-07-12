import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { fontAssets, getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";

// Plain-English draft describing what the app actually does today.
// DRAFT: needs proper (legal) review before the app has real users --
// tracked in the CLAUDE.md backlog.

const sections: { heading: string; body: string }[] = [
  {
    heading: "What Greenie stores",
    body:
      "Your account: email address, username, display name, bio, and your privacy settings. " +
      "Your plants: names, nicknames, species, locations, acquisition dates, and care schedules. " +
      "Your activity: progress reports, comments, likes, and who you follow or who follows you. " +
      "Photos are not collected yet — the app currently shows placeholders.",
  },
  {
    heading: "Where it lives",
    body:
      "All data is stored in a Supabase project (Postgres database and authentication). " +
      "Access is protected by row-level security: private content is enforced by the database itself, " +
      "not just hidden by the app.",
  },
  {
    heading: "What leaves the app",
    body:
      "When you use the AI plant lookup while adding a plant, the plant name or description you typed " +
      "is sent to Google Gemini to identify the species and suggest a watering schedule. " +
      "No account data is attached to that request. Nothing else is shared with third parties.",
  },
  {
    heading: "What Greenie doesn't do",
    body: "No advertising, no tracking, no analytics, no selling of data — none of that exists in this app.",
  },
  {
    heading: "Your rights",
    body:
      "Rectification: edit your profile details on the Profile page at any time. " +
      "Portability: download everything Greenie stores about you as a JSON file from Settings → Your data. " +
      "Erasure: permanently delete your account and all of its data from Settings → Danger zone. " +
      "Deletion is immediate and irreversible — your plants, reports, comments, likes, and follows are all removed.",
  },
  {
    heading: "Consent",
    body:
      "Creating an account requires agreeing to this policy; the time of your agreement is stored with " +
      "your profile. If this policy materially changes, you'll be asked to review it again.",
  },
];

export default function PrivacyPolicyScreen() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fonts = getFonts(fontsLoaded && !fontError);
  const { colors } = useTheme();

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Privacy Policy" }} />

      <View style={[styles.draftBanner, { backgroundColor: colors.sage }]}>
        <Text style={[styles.draftText, { fontFamily: fonts.bodyMedium, color: colors.mossStrong }]}>
          Draft — requires review before public launch
        </Text>
      </View>

      {/* Keep in sync with app_config.privacy_policy_updated_at: a
          material policy change updates this line AND ships a migration
          bumping that value (which re-prompts every user once). This is
          hardcoded because this screen is public/pre-auth and app_config
          is only readable with a session. */}
      <Text style={[styles.lastUpdated, { fontFamily: fonts.body, color: colors.inkSoft }]}>
        Last updated: 9 July 2026
      </Text>

      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={[styles.heading, { fontFamily: fonts.display, color: colors.ink }]}>
            {section.heading}
          </Text>
          <Text style={[styles.body, { fontFamily: fonts.body, color: colors.ink }]}>{section.body}</Text>
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
