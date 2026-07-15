import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";

// Shared display piece for every plant thumb / avatar / report photo:
// renders the real photo once a URL exists, else the same flat-color
// placeholder every screen already used before photo capture existed.
export function PhotoThumb({ uri, size, radius }: { uri: string | null; size: number; radius: number }) {
  const { colors } = useTheme();
  const sizeStyle = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, sizeStyle]} />;
  }

  return <View style={[styles.image, sizeStyle, { backgroundColor: colors.sage }]} />;
}

const styles = StyleSheet.create({
  image: {
    overflow: "hidden",
  },
});
