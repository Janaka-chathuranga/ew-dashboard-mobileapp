import { Redirect, Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSession } from "../../context/auth-context";

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useSession();
  const { colorScheme } = useColorScheme();
  const bg = colorScheme === "dark" ? "#111827" : "#f9fafb";

  // Show nothing while auth resolves; the splash screen covers this.
  if (isLoading) {
    return null;
  }

  // Auth gate: unauthenticated users go to sign in.
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  // Modern app feel: detail screens slide in from the right with an
  // interactive back-swipe; pure create/edit forms present as bottom sheets.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        contentStyle: { backgroundColor: bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="issues/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="issues/[id]/index" />
      <Stack.Screen name="issues/[id]/edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="projects/index" />
      <Stack.Screen name="projects/[id]" />
      <Stack.Screen name="task-list" />
      <Stack.Screen name="audit" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="admin/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin/users" />
      <Stack.Screen name="admin/user-edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin/companies" />
      <Stack.Screen name="admin/departments" />
      <Stack.Screen name="admin/groups" />
      <Stack.Screen name="admin/designations" />
      <Stack.Screen name="admin/roles" />
      <Stack.Screen name="admin/project-new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin/team" />
      <Stack.Screen name="admin/team-tasks" />
    </Stack>
  );
}
