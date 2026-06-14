import { useSession } from "@/context/auth-context";
import { useAdminUsers, type AdminUser } from "@/features/admin";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function roleLabel(role: string) {
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user } = useSession();
  const allowed = !!user?.canAccessConsole || user?.role === "admin";

  const { data: users, isLoading, isError, error, refetch, isRefetching } =
    useAdminUsers();

  if (user && !allowed) {
    return <Redirect href="/(protected)/(tabs)/profile" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          Users
        </Text>
        <View className="flex-1" />
        <TouchableOpacity
          onPress={() => router.push("/admin/new")}
          className="flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-lg"
        >
          <Ionicons name="person-add" size={16} color="white" />
          <Text className="text-white font-medium ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load users"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u: AdminUser) => u.accountId}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/admin/user-edit?id=${item.accountId}`)}
              activeOpacity={0.7}
              className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-3.5 mb-2.5 border border-gray-100 dark:border-gray-700"
            >
              <View className="h-10 w-10 rounded-full bg-indigo-500 items-center justify-center">
                <Text className="text-xs font-bold text-white">
                  {item.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 dark:text-gray-100 font-medium">
                  {item.displayName}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {item.emailAddress}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-600 dark:text-gray-300">
                  {roleLabel(item.roleId)}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full mt-1 ${
                    item.active
                      ? "bg-green-100 dark:bg-green-900/40"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-medium ${
                      item.active
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-500"
                    }`}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
