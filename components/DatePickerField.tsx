import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import {
  buildMonthDate,
  clampMonthToYear,
  getYearMonth,
  getYearPage,
  isMonthOutOfRange,
  isYearOutOfRange,
  shiftMonth,
  todayISO,
} from "../lib/dateGrid";
import { getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { useLanguage } from "../lib/LanguageContext";

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

const MONTH_ABBREV_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

// Structural type instead of importing XDate from the 'xdate' package
// directly -- it's only a transitive dependency of react-native-calendars
// (confirmed via grep, not in package.json), so depending on it directly
// could break on a future react-native-calendars bump.
type MonthLike = { toString(format: string): string };

// Drop-in replacement for a TextInput used for a single YYYY-MM-DD
// value -- callers keep their own label Text exactly as before, this
// only replaces the input box. A pure-JS calendar (not the native OS
// picker) so it renders identically and on-brand on web, iOS, and
// Android alike -- see the "Date picker for all date inputs" plan.
export function DatePickerField({
  value,
  onChange,
  placeholder,
  fonts,
  minDate,
  maxDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fonts: ReturnType<typeof getFonts>;
  minDate?: string;
  maxDate?: string;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t("datePickerField.defaultPlaceholder");
  const [isOpen, setIsOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"days" | "months" | "years">("days");
  // The month currently being browsed -- independent from `value` so
  // navigating around doesn't commit anything until a day is tapped.
  const [viewDate, setViewDate] = useState(value || minDate || todayISO());
  const [yearPageStart, setYearPageStart] = useState(0);

  function handleOpen() {
    // Falls back to minDate before today so opening an empty field
    // with a future-only range (e.g. End date after Start date is
    // picked) doesn't open on a mostly-disabled current month.
    setViewDate(value || minDate || todayISO());
    setPickerMode("days");
    setIsOpen(true);
  }

  function handleDayPress(day: DateData) {
    onChange(day.dateString);
    setIsOpen(false);
  }

  function handleClear() {
    onChange("");
    setIsOpen(false);
  }

  function openMonths() {
    setPickerMode("months");
  }

  function openYears() {
    setYearPageStart(getYearPage(getYearMonth(viewDate).year)[0]);
    setPickerMode("years");
  }

  function pickMonth(year: number, month0: number) {
    setViewDate(buildMonthDate(year, month0));
    setPickerMode("days");
  }

  function pickYear(year: number) {
    // The currently-browsed month might not exist in the target year's
    // valid range (e.g. browsing August with maxDate capped at July of
    // that year) -- clamp so this never lands on an out-of-range month.
    const month0 = clampMonthToYear(getYearMonth(viewDate).month0, year, minDate, maxDate);
    setViewDate(buildMonthDate(year, month0));
    setPickerMode("days");
  }

  const { year: viewYear, month0: viewMonth0 } = getYearMonth(viewDate);
  const prevMonth = shiftMonth(viewYear, viewMonth0, -1);
  const nextMonth = shiftMonth(viewYear, viewMonth0, 1);

  return (
    <>
      <Pressable style={[styles.input, { borderColor: colors.line }]} onPress={handleOpen}>
        <Text style={[styles.value, { fontFamily: fonts.body, color: value ? colors.ink : colors.inkSoft }]}>
          {value || resolvedPlaceholder}
        </Text>
      </Pressable>

      {/* Conditionally rendered (not just visible={isOpen}) -- Modal's
          visible prop alone doesn't reliably unmount content on web. */}
      {isOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
            {/* Empty onPress swallows the touch so it doesn't bubble to the backdrop's close handler. */}
            <Pressable style={[styles.card, { backgroundColor: colors.paperRaised }]} onPress={() => {}}>
              {pickerMode === "days" ? (
                <Calendar
                  current={viewDate}
                  minDate={minDate}
                  maxDate={maxDate}
                  disableArrowLeft={isMonthOutOfRange(prevMonth.year, prevMonth.month0, minDate, maxDate)}
                  disableArrowRight={isMonthOutOfRange(nextMonth.year, nextMonth.month0, minDate, maxDate)}
                  onDayPress={handleDayPress}
                  onMonthChange={(day) => setViewDate(day.dateString)}
                  markedDates={
                    value ? { [value]: { selected: true, selectedColor: colors.moss, selectedTextColor: colors.paperRaised } } : {}
                  }
                  renderHeader={(month?: MonthLike) => (
                    <View style={styles.headerRow}>
                      <Pressable onPress={openMonths} hitSlop={6}>
                        <Text style={[styles.headerText, { fontFamily: fonts.display, color: colors.ink }]}>
                          {month?.toString("MMMM")}
                        </Text>
                      </Pressable>
                      <Pressable onPress={openYears} hitSlop={6}>
                        <Text style={[styles.headerText, styles.headerYearText, { fontFamily: fonts.display, color: colors.ink }]}>
                          {month?.toString("yyyy")}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  theme={{
                    calendarBackground: colors.paperRaised,
                    dayTextColor: colors.ink,
                    monthTextColor: colors.ink,
                    textDisabledColor: colors.line,
                    arrowColor: colors.moss,
                    todayTextColor: colors.moss,
                    selectedDayBackgroundColor: colors.moss,
                    selectedDayTextColor: colors.paperRaised,
                    textSectionTitleColor: colors.inkSoft,
                    textDayFontFamily: fonts.body,
                    textMonthFontFamily: fonts.display,
                    textDayHeaderFontFamily: fonts.bodyMedium,
                  }}
                />
              ) : null}

              {pickerMode === "months" ? (
                <View>
                  <View style={styles.subHeaderRow}>
                    <Pressable
                      onPress={() => setViewDate(buildMonthDate(viewYear - 1, viewMonth0))}
                      disabled={isYearOutOfRange(viewYear - 1, minDate, maxDate)}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.chevron,
                          {
                            fontFamily: fonts.bodySemiBold,
                            color: isYearOutOfRange(viewYear - 1, minDate, maxDate) ? colors.line : colors.moss,
                          },
                        ]}
                      >
                        ‹
                      </Text>
                    </Pressable>
                    <Text style={[styles.subHeaderText, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                      {viewYear}
                    </Text>
                    <Pressable
                      onPress={() => setViewDate(buildMonthDate(viewYear + 1, viewMonth0))}
                      disabled={isYearOutOfRange(viewYear + 1, minDate, maxDate)}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.chevron,
                          {
                            fontFamily: fonts.bodySemiBold,
                            color: isYearOutOfRange(viewYear + 1, minDate, maxDate) ? colors.line : colors.moss,
                          },
                        ]}
                      >
                        ›
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setPickerMode("days")} hitSlop={8} style={styles.backLink}>
                    <Text style={[styles.backText, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                      {t("datePickerField.backToCalendar")}
                    </Text>
                  </Pressable>
                  <View style={styles.grid}>
                    {MONTH_KEYS.map((key, month0) => ({ key, month0 }))
                      .filter(({ month0 }) => !isMonthOutOfRange(viewYear, month0, minDate, maxDate))
                      .map(({ key, month0 }) => {
                        const isCurrent = month0 === viewMonth0;
                        return (
                          <Pressable
                            key={key}
                            style={[
                              styles.gridChip,
                              { borderColor: colors.line, backgroundColor: isCurrent ? colors.moss : "transparent" },
                            ]}
                            onPress={() => pickMonth(viewYear, month0)}
                          >
                            <Text
                              style={[
                                styles.gridChipText,
                                { fontFamily: fonts.bodyMedium, color: isCurrent ? colors.paperRaised : colors.ink },
                              ]}
                            >
                              {t(`datePickerField.monthAbbrev.${MONTH_ABBREV_KEYS[month0]}`)}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>
              ) : null}

              {pickerMode === "years" ? (
                (() => {
                  const minYear = minDate ? Number(minDate.slice(0, 4)) : undefined;
                  const maxYear = maxDate ? Number(maxDate.slice(0, 4)) : undefined;
                  // Pages are contiguous and sorted, so checking just the
                  // nearest year in the adjacent page is enough -- if it's
                  // already out of range, all 12 in that page are.
                  const prevPageDisabled = minYear !== undefined && yearPageStart - 1 < minYear;
                  const nextPageDisabled = maxYear !== undefined && yearPageStart + 12 > maxYear;
                  return (
                    <View>
                      <View style={styles.subHeaderRow}>
                        <Pressable
                          onPress={() => setYearPageStart((start) => start - 12)}
                          disabled={prevPageDisabled}
                          hitSlop={8}
                        >
                          <Text
                            style={[
                              styles.chevron,
                              { fontFamily: fonts.bodySemiBold, color: prevPageDisabled ? colors.line : colors.moss },
                            ]}
                          >
                            ‹
                          </Text>
                        </Pressable>
                        <Text style={[styles.subHeaderText, { fontFamily: fonts.bodyMedium, color: colors.ink }]}>
                          {yearPageStart}–{yearPageStart + 11}
                        </Text>
                        <Pressable
                          onPress={() => setYearPageStart((start) => start + 12)}
                          disabled={nextPageDisabled}
                          hitSlop={8}
                        >
                          <Text
                            style={[
                              styles.chevron,
                              { fontFamily: fonts.bodySemiBold, color: nextPageDisabled ? colors.line : colors.moss },
                            ]}
                          >
                            ›
                          </Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => setPickerMode("days")} hitSlop={8} style={styles.backLink}>
                        <Text style={[styles.backText, { fontFamily: fonts.bodyMedium, color: colors.inkSoft }]}>
                          {t("datePickerField.backToCalendar")}
                        </Text>
                      </Pressable>
                      <View style={styles.grid}>
                        {Array.from({ length: 12 }, (_, i) => yearPageStart + i)
                          .filter((year) => !isYearOutOfRange(year, minDate, maxDate))
                          .map((year) => {
                            const isCurrent = year === viewYear;
                            return (
                              <Pressable
                                key={year}
                                style={[
                                  styles.gridChip,
                                  { borderColor: colors.line, backgroundColor: isCurrent ? colors.moss : "transparent" },
                                ]}
                                onPress={() => pickYear(year)}
                              >
                                <Text
                                  style={[
                                    styles.gridChipText,
                                    { fontFamily: fonts.bodyMedium, color: isCurrent ? colors.paperRaised : colors.ink },
                                  ]}
                                >
                                  {year}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    </View>
                  );
                })()
              ) : null}

              {pickerMode === "days" && value ? (
                <Pressable onPress={handleClear} hitSlop={8} style={styles.clearLink}>
                  <Text style={[styles.clearText, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                    {t("datePickerField.clearDate")}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  value: {
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  clearLink: {
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  clearText: {
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  headerText: {
    fontSize: 16,
  },
  headerYearText: {
    opacity: 0.7,
  },
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  subHeaderText: {
    fontSize: 16,
    minWidth: 100,
    textAlign: "center",
  },
  chevron: {
    fontSize: 22,
    paddingHorizontal: spacing.xs,
  },
  backLink: {
    alignItems: "center",
    paddingBottom: spacing.xs,
  },
  backText: {
    fontSize: 13,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
    paddingBottom: spacing.xs,
  },
  gridChip: {
    width: "28%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  gridChipText: {
    fontSize: 14,
  },
});
