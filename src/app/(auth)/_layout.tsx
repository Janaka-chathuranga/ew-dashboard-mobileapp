import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../../context/auth-context";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useSession();

  // show loading spinner

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  // Redirect to main app if already authenticated
  if (isAuthenticated && !isLoading) {
    console.log("User is authenticated, redirecting to main app");
    console.log("is this true", isAuthenticated);
    // return router.replace("/"); // or redirect to main app
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="signin" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}
