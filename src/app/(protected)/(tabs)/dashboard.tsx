import { useSession } from "@/context/auth-context";
import { UserCard, useTeamDashboard } from "@/features/dashboard";
import { NotificationBell } from "@/features/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedStatusBar } from "@/components/themed-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TeamDashboardScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { data: cards, isLoading, isError, error, refetch, isRefetching } =
    useTeamDashboard();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = cards ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [cards, search]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ThemedStatusBar />

      <View className="bg-indigo-600 px-5 pt-5 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-xl font-bold">Team Dashboard</Text>
            <Text className="text-indigo-100 text-xs mt-0.5">
              {(cards?.length ?? 0)} member{(cards?.length ?? 0) === 1 ? "" : "s"}
              {" · "}task progress this month
            </Text>
          </View>
          <NotificationBell />
        </View>

        <View className="flex-row items-center bg-white/15 rounded-lg px-3 mt-3">
          <Ionicons name="search" size={18} color="#e0e7ff" />
          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#c7d2fe"
            value={search}
            onChangeText={setSearch}
            className="flex-1 py-2.5 px-2 text-white"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-500 dark:text-gray-400 mt-3">
            Loading team…
          </Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load dashboard"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.userId}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <UserCard
              card={item}
              onPress={
                user?.role === "admin" ||
                user?.role === "head" ||
                user?.role === "department-lead"
                  ? () =>
                      router.push(
                        `/admin/team-tasks?id=${item.userId}&name=${encodeURIComponent(
                          item.displayName
                        )}`
                      )
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 dark:text-gray-400 mt-3">
                No team members to show
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
