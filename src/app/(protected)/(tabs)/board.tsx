import { useSession } from "@/context/auth-context";
import {
  ALL_PROJECTS,
  BoardCard,
  MoveStatusSheet,
  useBoard,
  useMoveIssue,
  type BoardIssue,
  type MoveOption,
} from "@/features/board";
import { SearchableSelect } from "@/components/searchable-select";
import { NotificationBell } from "@/features/notifications";
import { useProjects } from "@/features/projects";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedStatusBar } from "@/components/themed-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BoardScreen() {
  const router = useRouter();
  const { user } = useSession();
  // Task managers can move any card; everyone else can move cards assigned to
  // them (assignee self-service — RLS allows the underlying status update).
  const canManage = !!user?.canManageTasks;
  const canMoveIssue = (issue: BoardIssue) =>
    canManage || issue.assignees.some((a) => a.id === user?.id);

  const { data: projects = [] } = useProjects();
  const [projectId, setProjectId] = useState<string>(ALL_PROJECTS);
  const { data: board, isLoading, isError, error } = useBoard(projectId);
  const moveMutation = useMoveIssue();

  const [moveTarget, setMoveTarget] = useState<BoardIssue | null>(null);

  const projectItems = useMemo(
    () => [
      { label: "All projects", value: ALL_PROJECTS },
      ...projects.map((p) => ({ label: `${p.key} — ${p.name}`, value: p.id })),
    ],
    [projects]
  );

  const isAggregated = projectId === ALL_PROJECTS;

  // Move-sheet options + the issue's current column value.
  const moveOptions: MoveOption[] = useMemo(() => {
    if (!board) return [];
    return board.columns.map((c) => ({
      value: isAggregated ? c.category : c.key,
      label: c.label,
    }));
  }, [board, isAggregated]);

  const currentValue = useMemo(() => {
    if (!moveTarget || !board) return "";
    if (isAggregated) return moveTarget.columnId; // category
    return board.columns.find((c) => c.id === moveTarget.columnId)?.key ?? "";
  }, [moveTarget, board, isAggregated]);

  const handleSelect = (value: string) => {
    if (!moveTarget || !board) return;
    let statusKey = value;
    if (isAggregated) {
      // Resolve the issue's project status key for the chosen category.
      const key = board.statusByProjectCategory?.[moveTarget.projectId]?.[value];
      if (!key) {
        Alert.alert(
          "Cannot move",
          "This project has no status for that column."
        );
        return;
      }
      statusKey = key;
    }
    moveMutation.mutate(
      { issueId: moveTarget.id, statusKey },
      {
        onSuccess: () => setMoveTarget(null),
        onError: (e) =>
          Alert.alert(
            "Move failed",
            e instanceof Error ? e.message : "Unknown error"
          ),
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ThemedStatusBar />
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Board
          </Text>
          <NotificationBell color="#4f46e5" />
        </View>
        <SearchableSelect
          value={projectId}
          onChange={setProjectId}
          options={projectItems}
          allowClear={false}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load board"}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 4 }}
        >
          {board?.columns.map((col) => {
            const colIssues =
              board.issues.filter((i) => i.columnId === col.id) ?? [];
            return (
              <View
                key={col.id}
                className="mx-1.5 rounded-xl bg-gray-100 dark:bg-gray-800/60 p-2.5"
                style={{ width: 280 }}
              >
                <View className="flex-row items-center justify-between px-1 mb-2">
                  <Text className="font-semibold text-gray-700 dark:text-gray-200">
                    {col.label}
                  </Text>
                  <View className="bg-gray-300/60 dark:bg-gray-700 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-gray-600 dark:text-gray-300">
                      {colIssues.length}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  {colIssues.map((issue) => (
                    <BoardCard
                      key={issue.id}
                      issue={issue}
                      canMove={canMoveIssue(issue)}
                      onPress={() => router.push(`/issues/${issue.id}`)}
                      onMove={() => setMoveTarget(issue)}
                    />
                  ))}
                  {colIssues.length === 0 && (
                    <Text className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                      No tasks
                    </Text>
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      <MoveStatusSheet
        visible={!!moveTarget}
        title={moveTarget ? `Move ${moveTarget.key}` : "Move"}
        options={moveOptions}
        currentValue={currentValue}
        onSelect={handleSelect}
        onClose={() => setMoveTarget(null)}
        isMoving={moveMutation.isPending}
      />
    </SafeAreaView>
  );
}
