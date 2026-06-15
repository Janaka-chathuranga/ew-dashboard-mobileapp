import { useSession } from "@/context/auth-context";
import { useAdminUsers } from "@/features/admin";
import { useMyScopeDepartments } from "@/features/org";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TeamScreen() {
  const router = useRouter();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const isHeadLike =
    isAdmin || user?.role === "head" || user?.role === "department-lead";
  const allowed = isHeadLike || !!user?.canAccessConsole;

  const { data: users, isLoading, isError, error, refetch, isRefetching } =
    useAdminUsers();
  const { data: scopeDepts = [] } = useMyScopeDepartments();

  // Admins see everyone. Heads/leads are UI-scoped to their departments — a
  // product decision (profiles are readable by all via RLS); the tasks they can
  // then open are themselves gated by RLS (oversees_department).
  const visible = useMemo(() => {
    const list = users ?? [];
    if (isAdmin) return list;
    const set = new Set(scopeDepts);
    return list.filter((u) => u.departmentId && set.has(u.departmentId));
  }, [users, isAdmin, scopeDepts]);

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
          Team & Tasks
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load team"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(u) => u.accountId}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <Text className="text-center text-gray-500 dark:text-gray-400 mt-10">
              No team members to show.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/admin/team-tasks?id=${item.accountId}&name=${encodeURIComponent(
                    item.displayName
                  )}`
                )
              }
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
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
