import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";

const KEY = "ewis-color-scheme";

export type ThemePref = "light" | "dark" | "system";

/** Apply the user's saved theme on app start (defaults to following the OS). */
export async function applyStoredTheme() {
  try {
    const v = (await AsyncStorage.getItem(KEY)) as ThemePref | null;
    colorScheme.set(v ?? "system");
  } catch {
    // ignore — fall back to the system scheme
  }
}

/** Set + persist the theme preference. */
export async function persistTheme(v: ThemePref) {
  colorScheme.set(v);
  try {
    await AsyncStorage.setItem(KEY, v);
  } catch {
    // best-effort persistence
  }
}
