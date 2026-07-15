import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { pickImage, uploadPhoto, type PhotoContext } from "../lib/supabase/storage";
import { getErrorMessage } from "../lib/errors";
import { useTheme } from "../lib/ThemeContext";
import { radius, spacing, type Fonts } from "../lib/theme";
import { PhotoThumb } from "./PhotoThumb";

// Self-contained capture control: current photo (or placeholder) plus
// explicit "Take Photo"/"Choose from Library" links -- two links rather
// than one button + OS action sheet, since this app is tested primarily
// on web where Alert.alert is a no-op and camera capture isn't
// available; "Choose from Library" is what's realistically testable
// there, "Take Photo" is real-device-only.
export function PhotoPicker({
  value,
  onChange,
  context,
  size = 88,
  photoRadius,
  fonts,
}: {
  value: string | null;
  onChange: (url: string) => void;
  context: PhotoContext;
  size?: number;
  photoRadius?: number;
  fonts: Fonts;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(source: "camera" | "library") {
    if (busy) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const picked = await pickImage(source);
      if (!picked) {
        return;
      }
      const url = await uploadPhoto({
        base64: picked.base64,
        context,
        fileExtension: picked.fileExtension,
      });
      onChange(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const resolvedRadius = photoRadius ?? radius.sm;

  return (
    <View style={styles.wrap}>
      <View style={[styles.thumbWrap, { width: size, height: size }]}>
        <PhotoThumb uri={value} size={size} radius={resolvedRadius} />
        {busy ? (
          <View style={[styles.overlay, { borderRadius: resolvedRadius }]}>
            <ActivityIndicator color={colors.paperRaised} />
          </View>
        ) : null}
      </View>
      <View style={styles.linksRow}>
        <Pressable onPress={() => handlePick("camera")} disabled={busy} hitSlop={6}>
          <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Take Photo</Text>
        </Pressable>
        <Pressable onPress={() => handlePick("library")} disabled={busy} hitSlop={6}>
          <Text style={[styles.link, { fontFamily: fonts.bodyMedium, color: colors.moss }]}>Choose from Library</Text>
        </Pressable>
      </View>
      {error ? <Text style={[styles.errorText, { fontFamily: fonts.body, color: colors.coral }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.xs,
  },
  thumbWrap: {
    position: "relative",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  linksRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  link: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
  },
});
