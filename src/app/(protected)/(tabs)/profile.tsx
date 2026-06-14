import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedStatusBar } from "@/components/themed-status-bar";
import { useColorScheme } from "nativewind";
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../../context/auth-context";
import { persistTheme } from "../../../lib/theme";

function roleLabel(role?: string) {
  if (!role) return "Member";
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="p-4 border-b border-gray-100 dark:border-gray-700">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={20} color="#9CA3AF" />
        <View className="ml-3 flex-1">
          <Text className="text-gray-600 dark:text-gray-400 text-sm">{label}</Text>
          <Text className="text-gray-800 dark:text-gray-100 font-medium">{value}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut, isLoading } = useSession();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => signOut() },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <Ionicons name="person-circle" size={64} color="#9CA3AF" />
        <Text className="text-gray-600 dark:text-gray-300 mt-4">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  const initials = (user?.displayName ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const permissions: { label: string; granted: boolean }[] = [
    { label: "Manage tasks", granted: !!user?.canManageTasks },
    { label: "Delete tasks", granted: !!user?.canDeleteTasks },
    { label: "Filter dashboard", granted: !!user?.canFilterDashboard },
    { label: "Access console", granted: !!user?.canAccessConsole },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ThemedStatusBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="bg-indigo-600 px-6 py-8">
          <View className="items-center">
            <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-4">
              <Text className="text-3xl font-bold text-indigo-600">
                {initials}
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold">
              {user?.displayName ?? "Unnamed User"}
            </Text>
            <Text className="text-indigo-100 mt-1">{user?.email}</Text>
            <View className="flex-row items-center mt-2 bg-white/20 px-3 py-1 rounded-full">
              <Ionicons name="shield-checkmark" size={16} color="white" />
              <Text className="text-white text-sm ml-1 font-medium">
                {roleLabel(user?.role)}
              </Text>
            </View>
          </View>
        </View>

        {/* Organization Information */}
        <View className="px-6 py-6">
          <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Organization
          </Text>
          <View className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <InfoRow
              icon="business"
              label="Company"
              value={user?.companyName ?? "Not assigned"}
            />
            <InfoRow
              icon="people"
              label="Department"
              value={user?.departmentName ?? "Not assigned"}
            />
            <View className="p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name={user?.active ? "checkmark-circle" : "time"}
                  size={20}
                  color={user?.active ? "#10B981" : "#F59E0B"}
                />
                <Text
                  className={`ml-3 font-medium ${
                    user?.active ? "text-green-600" : "text-yellow-700"
                  }`}
                >
                  {user?.active ? "Account Active" : "Account Inactive"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Permissions */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Permissions
          </Text>
          <View className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex-row flex-wrap">
            {permissions.map((perm) => (
              <View
                key={perm.label}
                className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                  perm.granted
                    ? "bg-green-100 dark:bg-green-900/40"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    perm.granted
                      ? "text-green-800 dark:text-green-300"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {perm.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Settings
          </Text>
          <View className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-14">
            <View className="p-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name={isDark ? "moon" : "sunny-outline"}
                  size={20}
                  color="#6B7280"
                />
                <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(v) => persistTheme(v ? "dark" : "light")}
              />
            </View>

            {(user?.canAccessConsole ||
              user?.role === "admin" ||
              user?.role === "head" ||
              user?.role === "department-lead") && (
              <TouchableOpacity
                className="p-4 border-b border-gray-100 dark:border-gray-700"
                onPress={() => router.push("/admin")}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color="#6B7280"
                    />
                    <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">
                      Admin Console
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="p-4 border-b border-gray-100 dark:border-gray-700"
              onPress={() => router.push("/projects")}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="folder-outline" size={20} color="#6B7280" />
                  <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">
                    Projects
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="p-4" onPress={handleLogout}>
              <View className="flex-row items-center">
                <Ionicons name="log-out" size={20} color="#EF4444" />
                <Text className="ml-3 text-red-500 font-medium">Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
