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
      "Your account: email address, username, display name, bio, your privacy settings, notification " +
      "preferences, and (if you use push notifications) your device's push token. " +
      "Your plants: names, nicknames, species, locations, acquisition dates, and care schedules. " +
      "Your activity: progress reports, comments, likes, who you follow or who follows you, accounts " +
      "you've blocked, plant-sitting arrangements you're part of, your care-streak stats, notifications " +
      "about activity on your account, and any content reports you've filed. " +
      "Support & recognition: if you've supported Greenie's development, your lifetime donation total " +
      "and supporter badge tier; if you're a beta tester, that status; and your visibility preference " +
      "for each badge. " +
      "Photos: any photo you attach to your profile, a plant, or a progress report.",
  },
  {
    heading: "Where it lives",
    body:
      "All data, including uploaded photos, is stored in a Supabase project (Postgres database, " +
      "authentication, and file storage). Access is protected by row-level security: private content " +
      "is enforced by the database itself, not just hidden by the app.",
  },
  {
    heading: "What leaves the app",
    body:
      "When you use the AI plant lookup while adding a plant, the plant name, description, or photo " +
      "you provide is sent to Google Gemini to identify the species and suggest a watering schedule. " +
      "No account data is attached to that request. " +
      "Account emails — sign-up confirmation, password reset, and account-deletion codes — are sent " +
      "through Resend, our email delivery provider. If you use Settings → Your data → Email me a copy, " +
      "your full data export is also sent through Resend as an email attachment to your own account " +
      "address. " +
      "If you have push notifications enabled, your device's push token and the content of a " +
      "notification (for example, a care-task reminder) pass through Expo's push notification service " +
      "to reach your device. " +
      "If you sign up or sign in with Google, Google shares your email address and name with Greenie " +
      "to create or match your account — nothing else. " +
      "If you support the project via Buy Me a Coffee and it can match your donation to your account " +
      "(by email or by mentioning your @username), Buy Me a Coffee sends us your email, name, message, " +
      "and donation amount so we can credit your account; if it can't be matched automatically, that " +
      "information is reviewed manually. " +
      "Beyond what's described in this section, nothing else is sent to or received from third parties.",
  },
  {
    heading: "What Greenie doesn't do",
    body: "No advertising, no tracking, no analytics, no selling of data — none of that exists in this app.",
  },
  {
    heading: "Your rights",
    body:
      "Rectification: edit your profile details on the Profile page at any time. " +
      "Portability: download everything Greenie stores about you as a JSON file from Settings → Your data, " +
      "or have a copy emailed to your account address instead. " +
      "Erasure: permanently delete your account and all of its data — including your plants, reports, " +
      "comments, likes, follows, and uploaded photos — from Settings → Danger zone. Deletion is " +
      "immediate and irreversible.",
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
        Last updated: 1 August 2026
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
