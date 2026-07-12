import { Platform } from "react-native";
import { getFonts, resolveScheme } from "./theme";

describe("getFonts", () => {
  it("returns the loaded Google Font family names when fontsLoaded is true", () => {
    expect(getFonts(true)).toEqual({
      display: "Lora_600SemiBold",
      displayItalic: "Lora_400Regular_Italic",
      displayMedium: "Lora_500Medium",
      body: "WorkSans_400Regular",
      bodyMedium: "WorkSans_500Medium",
      bodySemiBold: "WorkSans_600SemiBold",
    });
  });

  it("falls back to the platform system font when fontsLoaded is false", () => {
    const expectedDisplay = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" });
    const expectedBody = Platform.select({
      ios: undefined,
      android: "sans-serif",
      default: "-apple-system, sans-serif",
    });

    expect(getFonts(false)).toEqual({
      display: expectedDisplay,
      displayItalic: expectedDisplay,
      displayMedium: expectedDisplay,
      body: expectedBody,
      bodyMedium: expectedBody,
      bodySemiBold: expectedBody,
    });
  });
});

describe("resolveScheme", () => {
  it("resolves system to dark when the OS reports dark", () => {
    expect(resolveScheme("system", "dark")).toBe("dark");
  });

  it("resolves system to light when the OS reports light", () => {
    expect(resolveScheme("system", "light")).toBe("light");
  });

  it("defaults system to light when the OS reports null", () => {
    expect(resolveScheme("system", null)).toBe("light");
  });

  it("defaults system to light when the OS reports undefined", () => {
    expect(resolveScheme("system", undefined)).toBe("light");
  });

  it("passes light through regardless of system scheme", () => {
    expect(resolveScheme("light", "dark")).toBe("light");
  });

  it("passes dark through regardless of system scheme", () => {
    expect(resolveScheme("dark", "light")).toBe("dark");
  });
});
