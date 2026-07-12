import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { colors, getFonts, radius, spacing } from "../lib/theme";

// Drop-in replacement for a TextInput used for a single YYYY-MM-DD
// value -- callers keep their own label Text exactly as before, this
// only replaces the input box. A pure-JS calendar (not the native OS
// picker) so it renders identically and on-brand on web, iOS, and
// Android alike -- see the "Date picker for all date inputs" plan.
export function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  fonts,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fonts: ReturnType<typeof getFonts>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleDayPress(day: DateData) {
    onChange(day.dateString);
    setIsOpen(false);
  }

  function handleClear() {
    onChange("");
    setIsOpen(false);
  }

  return (
    <>
      <Pressable style={[styles.input, { borderColor: colors.line }]} onPress={() => setIsOpen(true)}>
        <Text style={[styles.value, { fontFamily: fonts.body, color: value ? colors.ink : colors.inkSoft }]}>
          {value || placeholder}
        </Text>
      </Pressable>

      {/* Conditionally rendered (not just visible={isOpen}) -- Modal's
          visible prop alone doesn't reliably unmount content on web. */}
      {isOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
            {/* Empty onPress swallows the touch so it doesn't bubble to the backdrop's close handler. */}
            <Pressable style={[styles.card, { backgroundColor: colors.paperRaised }]} onPress={() => {}}>
              <Calendar
                current={value || undefined}
                onDayPress={handleDayPress}
                markedDates={
                  value ? { [value]: { selected: true, selectedColor: colors.moss, selectedTextColor: colors.paperRaised } } : {}
                }
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
              {value ? (
                <Pressable onPress={handleClear} hitSlop={8} style={styles.clearLink}>
                  <Text style={[styles.clearText, { fontFamily: fonts.bodyMedium, color: colors.coral }]}>
                    Clear date
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
});
