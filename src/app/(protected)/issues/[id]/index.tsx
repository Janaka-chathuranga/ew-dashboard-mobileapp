import { useSession } from "@/context/auth-context";
import { MoveStatusSheet, type MoveOption } from "@/features/board";
import {
  fetchProjectStatuses,
  priorityPill,
  statusPill,
  typeVisual,
  useDeleteIssue,
  useIssue,
  useUpdateIssue,
} from "@/features/issues";
import { formatDuration } from "@/lib/duration";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-b border-gray-100 dark:border-gray-700">
      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </Text>
      <Text className="text-gray-900 dark:text-gray-100">{value}</Text>
    </View>
  );
}

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const { data: issue, isLoading, isError, error } = useIssue(id);
  const deleteMutation = useDeleteIssue();
  const updateMutation = useUpdateIssue(id);
  const [statusSheet, setStatusSheet] = useState(false);

  // Assignees (not just task managers) may change status / edit their own task's
  // dates & time tracking. RLS allows the underlying update; the edit form runs
  // in restricted mode for them.
  const isAssignee = !!user && issue?.fields.assignee?.accountId === user.id;
  const canEdit = !!user?.canManageTasks || isAssignee;
  const canDelete = !!user?.canDeleteTasks;

  // Status options for this issue's project (drives the inline status changer).
  const projectId = issue?.fields.project?.id as string | undefined;
  const { data: statuses = [] } = useQuery({
    queryKey: ["project-statuses", projectId],
    queryFn: () => fetchProjectStatuses(projectId as string),
    enabled: !!projectId && canEdit,
    staleTime: 5 * 60 * 1000,
  });

  const statusOptions: MoveOption[] = useMemo(
    () => statuses.map((s) => ({ value: s.key, label: s.label })),
    [statuses]
  );
  // The JiraIssue shape carries the status label, not its key — match back to
  // the key so the current option is highlighted in the sheet.
  const currentStatusKey =
    statuses.find((s) => s.label === issue?.fields.status.name)?.key ?? "";

  const changeStatus = (statusKey: string) => {
    updateMutation.mutate(
      { statusId: statusKey },
      {
        onSuccess: () => setStatusSheet(false),
        onError: (e) =>
          Alert.alert(
            "Could not update status",
            e instanceof Error ? e.message : "Unknown error"
          ),
      }
    );
  };

  const confirmDelete = () => {
    if (!issue) return;
    Alert.alert(
      "Delete task",
      `Delete ${issue.key}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            // Delete filters on the UUID id, never the human key.
            deleteMutation.mutate(issue.id, {
              onSuccess: () => {
                Alert.alert("Success", "Task deleted.");
                router.back();
              },
              onError: (e) =>
                Alert.alert(
                  "Delete failed",
                  e instanceof Error ? e.message : "Unknown error"
                ),
            }),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          {issue?.key ?? "Task"}
        </Text>
        <View className="flex-1" />
        {issue && canEdit && (
          <TouchableOpacity
            onPress={() => router.push(`/issues/${issue.id}/edit`)}
            className="p-1 mr-2"
          >
            <Ionicons name="create-outline" size={24} color="#4f46e5" />
          </TouchableOpacity>
        )}
        {issue && canDelete && (
          <TouchableOpacity
            onPress={confirmDelete}
            disabled={deleteMutation.isPending}
            className="p-1"
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash-outline" size={23} color="#ef4444" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError || !issue ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Task not found"}
          </Text>
        </View>
      ) : (
        (() => {
          const f = issue.fields;
          const type = typeVisual(f.issuetype.name);
          const prio = priorityPill(f.priority.name);
          const status = statusPill(f.status.statusCategory.name);
          const estimate =
            f.timetracking?.originalEstimateSeconds != null
              ? formatDuration(
                  Math.round(f.timetracking.originalEstimateSeconds / 60)
                )
              : "";
          const spent =
            f.timetracking?.timeSpentSeconds != null
              ? formatDuration(Math.round(f.timetracking.timeSpentSeconds / 60))
              : "";
          const description =
            typeof f.description === "string" ? f.description : "";

          return (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View className="flex-row items-center mb-3">
                <Ionicons name={type.icon} size={18} color={type.color} />
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1.5 capitalize">
                  {f.issuetype.name}
                </Text>
                <View className="flex-1" />
                {canEdit ? (
                  <TouchableOpacity
                    onPress={() => setStatusSheet(true)}
                    disabled={updateMutation.isPending}
                    className={`flex-row items-center px-2.5 py-1 rounded-full ${status.bg}`}
                  >
                    {updateMutation.isPending ? (
                      <ActivityIndicator size="small" color="#6b7280" />
                    ) : (
                      <>
                        <Text className={`text-xs font-medium ${status.text}`}>
                          {f.status.name}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={13}
                          color="#6b7280"
                          style={{ marginLeft: 3 }}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
                    <Text className={`text-xs font-medium ${status.text}`}>
                      {f.status.name}
                    </Text>
                  </View>
                )}
              </View>

              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {f.summary}
              </Text>

              <View className="flex-row items-center mb-4">
                <View className={`px-2.5 py-1 rounded-full ${prio.bg}`}>
                  <Text
                    className={`text-xs font-medium capitalize ${prio.text}`}
                  >
                    {f.priority.name} priority
                  </Text>
                </View>
                {f.project?.name && (
                  <View className="flex-row items-center ml-3">
                    <Ionicons name="folder-outline" size={14} color="#9CA3AF" />
                    <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      {f.project.name}
                    </Text>
                  </View>
                )}
              </View>

              <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Description
                </Text>
                <Text className="text-gray-900 dark:text-gray-100">
                  {description || "No description provided."}
                </Text>
              </View>

              <View className="bg-white dark:bg-gray-800 rounded-xl px-4 mt-4 border border-gray-100 dark:border-gray-700">
                <Field
                  label="Assignee"
                  value={f.assignee?.displayName ?? "Unassigned"}
                />
                {issue.assignedBy && (
                  <Field
                    label="Assigned by"
                    value={issue.assignedBy.displayName}
                  />
                )}
                <Field
                  label="Start date"
                  value={
                    f.customfield_10015
                      ? new Date(f.customfield_10015).toLocaleDateString()
                      : "—"
                  }
                />
                <Field
                  label="Due date"
                  value={
                    f.duedate ? new Date(f.duedate).toLocaleDateString() : "—"
                  }
                />
                <Field label="Estimated" value={estimate || "—"} />
                <Field label="Time spent" value={spent || "—"} />
                <Field
                  label="Created"
                  value={new Date(f.created).toLocaleString()}
                />
              </View>
            </ScrollView>
          );
        })()
      )}

      <MoveStatusSheet
        visible={statusSheet}
        title={issue ? `Move ${issue.key}` : "Move"}
        options={statusOptions}
        currentValue={currentStatusKey}
        onSelect={changeStatus}
        onClose={() => setStatusSheet(false)}
        isMoving={updateMutation.isPending}
      />
    </SafeAreaView>
  );
}
