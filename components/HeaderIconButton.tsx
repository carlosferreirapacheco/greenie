import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "../lib/ThemeContext";
import type { Fonts } from "../lib/theme";

// Shared header action: an icon with a small label underneath, the
// same treatment as tab-bar items -- replaces the old text-link
// header actions that didn't fit on narrow screens.
export function HeaderIconButton({
  icon,
  label,
  onPress,
  fonts,
  disabled = false,
  badge = false,
  busy = false,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  fonts: Fonts;
  disabled?: boolean;
  badge?: boolean;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const tint = disabled ? colors.inkSoft : colors.moss;

  return (
    <Pressable style={styles.wrap} onPress={onPress} disabled={disabled || busy} hitSlop={6}>
      <View style={styles.iconWrap}>
        {busy ? (
          <ActivityIndicator size={20} color={tint} />
        ) : (
          <MaterialCommunityIcons name={icon} size={22} color={tint} />
        )}
        {badge ? <View style={[styles.badgeDot, { backgroundColor: colors.coral }]} /> : null}
      </View>
      <Text style={[styles.label, { fontFamily: fonts.bodyMedium, color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    minWidth: 44,
  },
  iconWrap: {
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 9,
    marginTop: 1,
  },
});
