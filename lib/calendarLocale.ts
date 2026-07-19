import { LocaleConfig } from "react-native-calendars";
import type { SupportedLocale } from "./i18n";

// react-native-calendars' day-grid (weekday headers, the "today" label,
// accessibility text) is driven by a separate mechanism from the t()
// dictionary -- xdate's own global LocaleConfig.locales object,
// switched via LocaleConfig.defaultLocale. Registered once at module
// load (not per DatePickerField instance) since xdate stores this as
// module-level state shared across every Calendar on screen.
LocaleConfig.locales.pt = {
  monthNames: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ],
  monthNamesShort: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
  dayNames: [
    "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado",
  ],
  dayNamesShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  today: "Hoje",
  formatAccessibilityLabel: "dddd, d 'de' MMMM 'de' yyyy",
};

// Empty string is xdate's own built-in default-locale key (its English
// definitions), not a Greenie convention -- see XDate.defaultLocale's
// initial value in the xdate source.
export function syncCalendarLocale(locale: SupportedLocale): void {
  LocaleConfig.defaultLocale = locale === "pt-PT" ? "pt" : "";
}
