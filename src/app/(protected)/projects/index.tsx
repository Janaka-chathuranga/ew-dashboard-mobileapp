import { useSession } from "@/context/auth-context";
import { useProjects } from "@/features/projects";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
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

export default function ProjectsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const canCreate = user?.role === "admin" || !!user?.canManageTasks;
  const { data: projects, isLoading, isError, error, refetch, isRefetching } =
    useProjects();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          Projects
        </Text>
        <View className="flex-1" />
        {canCreate && (
          <TouchableOpacity
            onPress={() => router.push("/admin/project-new")}
            className="flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-lg"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-medium ml-1">New</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/projects/${item.id}`)}
              activeOpacity={0.7}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center">
                  <Text className="text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                    {item.key}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {item.name}
                  </Text>
                  {!!item.description && (
                    <Text
                      className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
              <View className="flex-row mt-3 gap-4">
                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={15} color="#6b7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {item.memberCount} members
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="list-outline" size={15} color="#6b7280" />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {item.issueCount} tasks
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-24">
              <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 dark:text-gray-400 mt-3">
                No projects visible
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
