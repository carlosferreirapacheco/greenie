import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { resolveLocale, t as translate, type LanguagePreference, type SupportedLocale } from "./i18n";
import { syncCalendarLocale } from "./calendarLocale";

const STORAGE_KEY = "languagePreference";

type LanguageContextValue = {
  locale: SupportedLocale;
  languagePreference: LanguagePreference;
  setLanguagePreference: (preference: LanguagePreference) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  loaded: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "en" || stored === "pt-PT" || stored === "system") {
          setLanguagePreferenceState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  function setLanguagePreference(preference: LanguagePreference) {
    setLanguagePreferenceState(preference);
    // Fire-and-forget, matching ThemeContext's tolerance for
    // non-critical persistence writes.
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  }

  const systemLocales = Localization.getLocales().map((entry) => entry.languageTag);
  const locale = resolveLocale(languagePreference, systemLocales);

  useEffect(() => {
    syncCalendarLocale(locale);
  }, [locale]);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        languagePreference,
        setLanguagePreference,
        t: (key, params) => translate(locale, key, params),
        loaded,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
