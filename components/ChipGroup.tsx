import { Pressable, StyleSheet, Text, View } from "react-native";
import { getFonts, radius, spacing } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";

// Single-select chip row, extracted from app/settings.tsx once
// per-report settings (app/log-progress.tsx, app/progress/[id].tsx)
// needed the same control.
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  fonts,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  fonts: ReturnType<typeof getFonts>;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chipRow, disabled && styles.chipRowDisabled]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.chip,
            { borderColor: colors.line, backgroundColor: value === option.value ? colors.sage : "transparent" },
          ]}
          onPress={() => !disabled && onChange(option.value)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.chipText,
              { fontFamily: fonts.bodyMedium, color: value === option.value ? colors.mossStrong : colors.ink },
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chipRowDisabled: {
    opacity: 0.5,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
  },
});
