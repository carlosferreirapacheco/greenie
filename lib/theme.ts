import { Platform, type ColorSchemeName } from "react-native";
import { Lora_400Regular_Italic, Lora_500Medium, Lora_600SemiBold } from "@expo-google-fonts/lora";
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from "@expo-google-fonts/work-sans";
import type { PlantCareStatus } from "./supabase/care_tasks";
import type { ResolvedBadge, SupporterTier } from "./badges";

// Passed to useFonts() by any screen that needs to know when fonts are
// ready. A single source so swapping fonts later is a one-file change.
export const fontAssets = {
  Lora_600SemiBold,
  Lora_500Medium,
  Lora_400Regular_Italic,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
};

export type Palette = {
  ink: string;
  inkSoft: string;
  moss: string;
  mossStrong: string;
  sage: string;
  paper: string;
  paperRaised: string;
  gold: string;
  goldSoft: string;
  coral: string;
  coralSoft: string;
  line: string;
};

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    ink: "#1C2A20",
    inkSoft: "#3F5347",
    moss: "#2F6B4F",
    mossStrong: "#234F3A",
    sage: "#E4EBE0",
    paper: "#EFF3EA",
    paperRaised: "#FFFFFF",
    gold: "#C99A3B",
    goldSoft: "#EFE0BD",
    coral: "#C4573F",
    coralSoft: "#F3DED8",
    line: "#D8DED2",
  },
  dark: {
    ink: "#EEF2EA",
    inkSoft: "#B9C5B7",
    moss: "#6FB98F",
    mossStrong: "#8FD0AB",
    sage: "#223129",
    paper: "#141C17",
    paperRaised: "#1B251E",
    gold: "#E0B862",
    goldSoft: "#3A3120",
    coral: "#E58671",
    coralSoft: "#3A231E",
    line: "#2C382E",
  },
};

export type ThemeScheme = "light" | "dark";
export type ThemePreference = ThemeScheme | "system";

// "system" defaults to light when the OS reports null/undefined (e.g. web
// browsers that don't expose prefers-color-scheme). Pure so it's testable
// independent of the ThemeContext plumbing that calls it.
export function resolveScheme(preference: ThemePreference, systemScheme: ColorSchemeName | null | undefined): ThemeScheme {
  if (preference === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return preference;
}

export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
};

const fallbackDisplay = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, serif",
});

const fallbackBody = Platform.select({
  ios: undefined,
  android: "sans-serif",
  default: "-apple-system, sans-serif",
});

export type Fonts = {
  display: string | undefined;
  displayItalic: string | undefined;
  displayMedium: string | undefined;
  body: string | undefined;
  bodyMedium: string | undefined;
  bodySemiBold: string | undefined;
};

export function getFonts(fontsLoaded: boolean): Fonts {
  if (fontsLoaded) {
    return {
      display: "Lora_600SemiBold",
      displayItalic: "Lora_400Regular_Italic",
      displayMedium: "Lora_500Medium",
      body: "WorkSans_400Regular",
      bodyMedium: "WorkSans_500Medium",
      bodySemiBold: "WorkSans_600SemiBold",
    };
  }

  return {
    display: fallbackDisplay,
    displayItalic: fallbackDisplay,
    displayMedium: fallbackDisplay,
    body: fallbackBody,
    bodyMedium: fallbackBody,
    bodySemiBold: fallbackBody,
  };
}

export function getStatusColors(colors: Palette): Record<PlantCareStatus, { bg: string; fg: string; dot: string }> {
  return {
    healthy: { bg: colors.sage, fg: colors.mossStrong, dot: colors.moss },
    due_soon: { bg: colors.goldSoft, fg: colors.gold, dot: colors.gold },
    overdue: { bg: colors.coralSoft, fg: colors.coral, dot: colors.coral },
  };
}

export type BadgeColors = { fg: string; soft: string };

// Purpose-built per-tier tones (bronze/silver/platinum), not reused
// from Palette -- except gold, which deliberately reuses
// colors.gold/goldSoft (same hex values, one source of truth). Values
// transcribed from the reviewed supporter-badge-options design artifact.
const tierTokensByScheme: Record<ThemeScheme, Record<"bronze" | "silver" | "platinum", BadgeColors>> = {
  light: {
    bronze: { fg: "#B0713D", soft: "#ECD9C4" },
    silver: { fg: "#8C97A0", soft: "#E4E8EA" },
    platinum: { fg: "#6E7B9E", soft: "#E1E4EE" },
  },
  dark: {
    bronze: { fg: "#CB8B57", soft: "#3B2C1E" },
    silver: { fg: "#A7B0B8", soft: "#2A2E31" },
    platinum: { fg: "#93A0C4", soft: "#262A3A" },
  },
};

export function getSupporterTierColors(scheme: ThemeScheme, colors: Palette): Record<SupporterTier, BadgeColors> {
  return { ...tierTokensByScheme[scheme], gold: { fg: colors.gold, soft: colors.goldSoft } };
}

// Beta tester deliberately reuses the app's own moss pair, not a tier
// tone -- mirrors ChipGroup's selected-state pair (sage bg, mossStrong
// text), signaling "recognition from the team" rather than "a tier."
export function getBadgeColors(badge: ResolvedBadge, scheme: ThemeScheme, colors: Palette): BadgeColors {
  if (badge.kind === "supporter_tier") {
    return getSupporterTierColors(scheme, colors)[badge.tier];
  }
  return { fg: colors.mossStrong, soft: colors.sage };
}
