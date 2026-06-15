import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Copy .env.example to .env and fill in the Supabase project values."
  );
}

/**
 * Auth session storage adapter.
 *
 * On web we use localStorage. On native we use AsyncStorage rather than
 * expo-secure-store: the Supabase session JSON (access + refresh tokens + user)
 * comfortably exceeds SecureStore's ~2KB soft limit, which makes SecureStore
 * warn and behave unreliably on Android. AsyncStorage is the storage Supabase's
 * own Expo guide recommends for the persisted session. (We only ever use the
 * publishable/anon key here, so the boundary is RLS — not local storage.)
 */
const storage =
  Platform.OS === "web"
    ? undefined // supabase-js defaults to localStorage on web
    : AsyncStorage;

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      // No deep-link OAuth callbacks in this app; disable URL session detection
      // so it doesn't run on web where there's no auth fragment.
      detectSessionInUrl: false,
    },
  }
);
