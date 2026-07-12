import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { palettes, resolveScheme, type Palette, type ThemePreference, type ThemeScheme } from "./theme";

const STORAGE_KEY = "themePreference";

type ThemeContextValue = {
  colors: Palette;
  scheme: ThemeScheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  loaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemePreferenceState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  function setThemePreference(preference: ThemePreference) {
    setThemePreferenceState(preference);
    // Fire-and-forget, matching this codebase's existing tolerance for
    // non-critical persistence writes (e.g. the Google-link localStorage flag).
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  }

  const scheme = resolveScheme(themePreference, systemScheme);
  const colors = palettes[scheme];

  return (
    <ThemeContext.Provider value={{ colors, scheme, themePreference, setThemePreference, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
