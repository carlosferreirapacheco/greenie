import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";
import { getInitials } from "../lib/initials";

// Shared display piece for every plant thumb / avatar / report photo:
// renders the real photo once a URL exists. When empty, a person
// avatar (name passed) falls back to 1-2 letter initials on the same
// sage circle -- an empty avatar reads as broken in a social app.
// Plant/report photos (no name passed) keep the original flat-color
// placeholder unchanged: a missing plant photo doesn't need
// "identity" the way a missing person avatar does.
export function PhotoThumb({
  uri,
  size,
  radius,
  name,
}: {
  uri: string | null;
  size: number;
  radius: number;
  name?: string | null;
}) {
  const { colors } = useTheme();
  const sizeStyle = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, sizeStyle]} />;
  }

  if (name) {
    return (
      <View style={[styles.image, styles.initials, sizeStyle, { backgroundColor: colors.sage }]}>
        <Text style={{ color: colors.moss, fontSize: size * 0.4, fontWeight: "700" }} numberOfLines={1}>
          {getInitials(name)}
        </Text>
      </View>
    );
  }

  return <View style={[styles.image, sizeStyle, { backgroundColor: colors.sage }]} />;
}

const styles = StyleSheet.create({
  image: {
    overflow: "hidden",
  },
  initials: {
    alignItems: "center",
    justifyContent: "center",
  },
});
