import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

/**
 * Status bar whose icon/text colour follows the app theme (NativeWind), so the
 * clock / battery stay legible on our light (`gray-50`) and dark (`gray-900`)
 * safe-area backgrounds — in light mode dark icons, in dark mode light icons.
 * Driven by NativeWind (not `style="auto"`) so it also respects the in-app
 * dark/light toggle, not just the OS appearance.
 */
export function ThemedStatusBar() {
  const { colorScheme } = useColorScheme();
  return <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />;
}
