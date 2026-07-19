import { en } from "./en";
import { ptPT } from "./pt-PT";

export type SupportedLocale = "en" | "pt-PT";
export type LanguagePreference = SupportedLocale | "system";

const dictionaries: Record<SupportedLocale, unknown> = {
  en,
  "pt-PT": ptPT,
};

// "system" matches the device's locale list against the supported set
// (Portugal/Portuguese variants resolve to pt-PT), falling back to
// English when nothing matches -- mirrors lib/theme.ts's
// resolveScheme() exactly. Pure so it's testable independent of
// LanguageContext/expo-localization.
export function resolveLocale(preference: LanguagePreference, systemLocales: string[]): SupportedLocale {
  if (preference !== "system") {
    return preference;
  }

  const matchesPortuguese = systemLocales.some((tag) => tag.toLowerCase().startsWith("pt"));
  return matchesPortuguese ? "pt-PT" : "en";
}

// Generic dot-path lookup + {token} interpolation, kept independent of
// the actual dictionary shape so it's testable against fake nested
// objects rather than requiring real translation content to exist.
// Falls back to the key itself for a genuinely missing path -- a
// defensive last resort, since pt-PT.ts being typed as `typeof en`
// means this should be unreachable in practice.
export function lookup(dict: unknown, key: string, params?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in node) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);

  if (typeof value !== "string") {
    return key;
  }

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (text, [token, replacement]) => text.replaceAll(`{${token}}`, String(replacement)),
    value
  );
}

export function t(locale: SupportedLocale, key: string, params?: Record<string, string | number>): string {
  return lookup(dictionaries[locale], key, params);
}
