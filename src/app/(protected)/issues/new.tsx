import { useSession } from "@/context/auth-context";
import {
  TaskForm,
  useCreateIssue,
  type AdminTaskInput,
  type TaskInputType,
} from "@/features/issues";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewTaskScreen() {
  const router = useRouter();
  const { user } = useSession();
  const createMutation = useCreateIssue();

  // Only users who can manage tasks may create them.
  if (user && !user.canManageTasks) {
    return <Redirect href="/task-list" />;
  }

  const onSubmit = (values: TaskInputType) => {
    if (!user) return;
    const input: AdminTaskInput = {
      title: values.title,
      reporterId: user.id,
      statusId: values.statusKey,
      projectId: values.projectId || null,
      description: values.description || undefined,
      priority: values.priority,
      type: values.type,
      assigneeId: values.assigneeId || null,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
      estimate: values.estimate || null,
      spent: values.spent || null,
    };
    createMutation.mutate(input, {
      onSuccess: (issue) => {
        Alert.alert("Success", "Task created.");
        router.replace(`/issues/${issue.id}`);
      },
      onError: (e) =>
        Alert.alert(
          "Could not create task",
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
          New Task
        </Text>
      </View>
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
              title: "",
              description: "",
              projectId: "",
              statusKey: "",
              assigneeId: "",
              priority: "medium",
              type: "task",
              startDate: "",
              dueDate: "",
              estimate: "",
              spent: "",
            }}
            onSubmit={onSubmit}
            submitLabel="Create Task"
            isSubmitting={createMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
