import { IssueCard, useUserTasks } from "@/features/issues";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

export default function TeamTasksScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  // Defaults to the current month. RLS (oversees_department) governs whether the
  // signed-in head/admin may actually see each of this user's tasks.
  const { data: tasks, isLoading, isError, error, refetch, isRefetching } =
    useUserTasks(id);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <View className="ml-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {name ?? "Tasks"}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Tasks this month
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load tasks"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => <IssueCard issue={item} />}
          ListEmptyComponent={
            <View className="items-center py-24">
              <Ionicons name="checkmark-done-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 dark:text-gray-400 mt-3">
                No tasks this month
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
