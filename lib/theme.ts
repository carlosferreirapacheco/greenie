import { Platform } from "react-native";
import { Lora_400Regular_Italic, Lora_500Medium, Lora_600SemiBold } from "@expo-google-fonts/lora";
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from "@expo-google-fonts/work-sans";
import type { PlantCareStatus } from "./supabase/care_tasks";

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

type Palette = {
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

// Light mode only for now — see lib/theme.ts plan notes. Swapping to
// useColorScheme()-driven theming later just means picking between
// palettes.light / palettes.dark here.
export const colors = palettes.light;

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

export const statusColors: Record<PlantCareStatus, { bg: string; fg: string; dot: string }> = {
  healthy: { bg: colors.sage, fg: colors.mossStrong, dot: colors.moss },
  due_soon: { bg: colors.goldSoft, fg: colors.gold, dot: colors.gold },
  overdue: { bg: colors.coralSoft, fg: colors.coral, dot: colors.coral },
};
