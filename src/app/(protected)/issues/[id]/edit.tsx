import { useSession } from "@/context/auth-context";
import {
  fetchIssueForEdit,
  TaskForm,
  useUpdateIssue,
  type AdminTaskInput,
  type TaskInputType,
} from "@/features/issues";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const updateMutation = useUpdateIssue(id);

  const {
    data: editable,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["issue-edit", id],
    queryFn: () => fetchIssueForEdit(id),
    enabled: !!id,
  });

  if (user && !user.canManageTasks) {
    return <Redirect href={`/issues/${id}`} />;
  }

  const onSubmit = (values: TaskInputType) => {
    const input: Partial<AdminTaskInput> = {
      title: values.title,
      statusId: values.statusKey,
      description: values.description ?? "",
      priority: values.priority,
      type: values.type,
      assigneeId: values.assigneeId || null,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
      estimate: values.estimate || null,
      spent: values.spent || null,
    };
    updateMutation.mutate(input, {
      onSuccess: () => {
        Alert.alert("Success", "Task updated.");
        router.back();
      },
      onError: (e) =>
        Alert.alert(
          "Could not update task",
          e instanceof Error ? e.message : "Unknown error"
        ),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          Edit Task
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError || !editable ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Task not found"}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <TaskForm
              defaultValues={{
                title: editable.title,
                description: editable.description ?? "",
                projectId: editable.projectId ?? "",
                statusKey: editable.statusKey,
                assigneeId: editable.assigneeId ?? "",
                priority: (editable.priority as TaskInputType["priority"]) ?? "medium",
                type: (editable.type as TaskInputType["type"]) ?? "task",
                startDate: editable.startDate ?? "",
                dueDate: editable.dueDate ?? "",
                estimate: editable.estimate ?? "",
                spent: editable.spent ?? "",
              }}
              onSubmit={onSubmit}
              submitLabel="Save Changes"
              isSubmitting={updateMutation.isPending}
              projectLocked
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
