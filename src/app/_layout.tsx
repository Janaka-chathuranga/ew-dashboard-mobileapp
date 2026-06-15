import "react-native-url-polyfill/auto";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import "../../global.css";
import { SessionProvider } from "../context/auth-context";
import { applyStoredTheme } from "../lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  // Apply the saved light/dark preference before the first paint.
  useEffect(() => {
    applyStoredTheme();
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
            <Stack.Screen name="(protected)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="index" />
            {/* <Slot /> */}
          </Stack>
        </SessionProvider>
      </QueryClientProvider>
    </>
  );
}
