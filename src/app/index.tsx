import { Redirect } from "expo-router";

export default function Index() {
  // Immediate redirect to protected area
  // Stack screen is configured with headerShown: false to prevent any header flash
  return <Redirect href="/(protected)/(tabs)" />;
}
