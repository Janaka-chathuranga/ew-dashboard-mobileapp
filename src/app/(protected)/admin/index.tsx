import { useSession } from "@/context/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface HubRow {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
  show: boolean;
}

export default function AdminHubScreen() {
  const router = useRouter();
  const { user } = useSession();

  const isAdmin = user?.role === "admin";
  const isHeadLike =
    isAdmin || user?.role === "head" || user?.role === "department-lead";
  const allowed = isAdmin || !!user?.canAccessConsole || isHeadLike;

  // Gate the whole console: admins, console-granted users, or department heads.
  if (user && !allowed) {
    return <Redirect href="/(protected)/(tabs)/profile" />;
  }

  const rows: HubRow[] = [
    {
      label: "Team & Tasks",
      subtitle: isAdmin ? "Everyone's tasks" : "Your departments' tasks",
      icon: "people-outline",
      href: "/admin/team",
      show: isHeadLike || !!user?.canAccessConsole,
    },
    {
      label: "Users",
      subtitle: "Create, edit & assign permissions",
      icon: "person-circle-outline",
      href: "/admin/users",
      show: isAdmin || !!user?.canAccessConsole,
    },
    {
      label: "Projects",
      subtitle: "View & create projects",
      icon: "folder-outline",
      href: "/projects",
      show: isAdmin || !!user?.canManageTasks || !!user?.canCreateProjects,
    },
    {
      label: "Companies",
      subtitle: "Manage companies",
      icon: "business-outline",
      href: "/admin/companies",
      show: isAdmin || !!user?.canCreateCompanies,
    },
    {
      label: "Departments",
      subtitle: "Manage departments",
      icon: "git-branch-outline",
      href: "/admin/departments",
      show: isAdmin || !!user?.canCreateDepartments,
    },
    {
      label: "Groups",
      subtitle: "Manage groups & team leads",
      icon: "grid-outline",
      href: "/admin/groups",
      show: isAdmin || !!user?.canCreateGroups,
    },
    {
      label: "Designations",
      subtitle: "Manage job titles",
      icon: "ribbon-outline",
      href: "/admin/designations",
      show: isAdmin || !!user?.canCreateDesignations,
    },
    {
      label: "Roles",
      subtitle: "Manage project member roles",
      icon: "shield-checkmark-outline",
      href: "/admin/roles",
      show: isAdmin || !!user?.canCreateRoles,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          Admin Console
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {rows
          .filter((r) => r.show)
          .map((r) => (
            <TouchableOpacity
              key={r.label}
              onPress={() => router.push(r.href)}
              activeOpacity={0.7}
              className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-4 mb-2.5 border border-gray-100 dark:border-gray-700"
            >
              <View className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center">
                <Ionicons name={r.icon} size={20} color="#4f46e5" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {r.label}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {r.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
