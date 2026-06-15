import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../context/auth-context";
import { IssueCard, useAllIssues, type JiraIssue } from "../../features/issues";

type ScopeFilter = "all" | "mine";
type StatusFilter = "all" | "To Do" | "In Progress" | "Done";

const STATUS_FILTERS: StatusFilter[] = ["all", "To Do", "In Progress", "Done"];

export default function TaskListScreen() {
  const { user } = useSession();
  const router = useRouter();
  const { data: issues, isLoading, isError, error, refetch, isRefetching } =
    useAllIssues();

  const [scope, setScope] = useState<ScopeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list: JiraIssue[] = issues ?? [];
    if (scope === "mine" && user?.id) {
      list = list.filter((i) => i.fields.assignee?.accountId === user.id);
    }
    if (status !== "all") {
      list = list.filter(
        (i) => i.fields.status.statusCategory.name === status
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.fields.summary.toLowerCase().includes(q) ||
          i.key.toLowerCase().includes(q)
      );
    }
    return list;
  }, [issues, scope, status, search, user?.id]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="p-1 mr-1">
              <Ionicons name="arrow-back" size={24} color="#4f46e5" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Tasks
            </Text>
          </View>
          {user?.canManageTasks && (
            <TouchableOpacity
              onPress={() => router.push("/issues/new")}
              className="flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-lg"
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-medium ml-1">New</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-lg px-3 mt-3 border border-gray-200 dark:border-gray-700">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search tasks..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            className="flex-1 py-2.5 px-2 text-gray-900 dark:text-gray-100"
          />
        </View>

        {/* Scope toggle */}
        <View className="flex-row mt-3 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
          {(["all", "mine"] as ScopeFilter[]).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setScope(s)}
              className={`flex-1 py-1.5 rounded-md ${
                scope === s ? "bg-white dark:bg-gray-700" : ""
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  scope === s
                    ? "text-indigo-600 dark:text-indigo-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {s === "all" ? "All visible" : "Assigned to me"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status chips */}
        <View className="flex-row mt-3 gap-2">
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatus(s)}
              className={`px-3 py-1 rounded-full border ${
                status === s
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  status === s
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {s === "all" ? "All" : s}
              </Text>
            </TouchableOpacity>
          ))}
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
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IssueCard issue={item} />}
          contentContainerStyle={{ padding: 20, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Ionicons name="file-tray-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 dark:text-gray-400 mt-3">
                No tasks match your filters
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
