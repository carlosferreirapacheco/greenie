import AsyncStorage from "@react-native-async-storage/async-storage";

// Device-local, not a profiles column -- this is a low-stakes UX nicety,
// not consent, matching the same per-device reasoning already used for
// the theme preference (ThemeContext.tsx). Seeing the prompt again after
// a reinstall or on a new device is an acceptable, low-stakes outcome.
const SEEN_KEY = "hasSeenHelpPrompt";

export async function getHasSeenHelpPrompt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === "true";
  } catch {
    // Fails open toward not re-showing the prompt on a storage hiccup --
    // a missed one-time prompt is a much smaller cost than nagging on
    // every launch.
    return true;
  }
}

export async function setHasSeenHelpPrompt(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "true");
  } catch {
    // Worst case the prompt reappears next launch.
  }
}
