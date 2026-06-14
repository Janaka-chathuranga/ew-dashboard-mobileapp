import { FormDateField } from "@/components/form-date-field";
import { FormField } from "@/components/form-field";
import { FormPicker } from "@/components/form-picker";
import { useProjects } from "@/features/projects";
import { useUsers } from "@/features/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchProjectStatuses } from "../api/issues";
import { taskSchema, type TaskInputType } from "../schema/task";

function ReadOnlyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-xs text-gray-800 dark:text-gray-200 font-medium">
        {value || "—"}
      </Text>
    </View>
  );
}

const PRIORITY_ITEMS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const TYPE_ITEMS = [
  { label: "Task", value: "task" },
  { label: "Story", value: "story" },
  { label: "Bug", value: "bug" },
  { label: "Epic", value: "epic" },
  { label: "Subtask", value: "subtask" },
];

export interface TaskFormProps {
  defaultValues: TaskInputType;
  onSubmit: (values: TaskInputType) => void | Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  // The update_issue RPC cannot move an issue between projects, so the edit
  // form locks the project to keep its workflow/status options consistent.
  projectLocked?: boolean;
}

export function TaskForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  projectLocked = false,
}: TaskFormProps) {
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskInputType>({
    resolver: zodResolver(taskSchema),
    defaultValues,
  });

  const selectedProjectId = watch("projectId");
  const selectedStatus = watch("statusKey");

  // Project is optional → fall back to the first project (matches createIssue's
  // default-project behaviour) so status options can still load.
  const effectiveProjectId = selectedProjectId || projects[0]?.id;

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ["project-statuses", effectiveProjectId],
    queryFn: () => fetchProjectStatuses(effectiveProjectId as string),
    enabled: !!effectiveProjectId,
    staleTime: 5 * 60 * 1000,
  });

  // Keep the selected status valid for the active project's workflow.
  useEffect(() => {
    if (statuses.length === 0) return;
    if (!statuses.some((s) => s.key === selectedStatus)) {
      setValue("statusKey", statuses[0].key);
    }
  }, [statuses, selectedStatus, setValue]);

  const projectItems = useMemo(
    () => projects.map((p) => ({ label: `${p.key} — ${p.name}`, value: p.id })),
    [projects]
  );
  const statusItems = useMemo(
    () => statuses.map((s) => ({ label: s.label, value: s.key })),
    [statuses]
  );
  const userItems = useMemo(
    () =>
      users.map((u) => ({
        label: u.displayName,
        value: u.id,
        description: u.designationName ?? undefined,
      })),
    [users]
  );

  const selectedAssigneeId = watch("assigneeId");
  const selectedAssignee = useMemo(
    () => users.find((u) => u.id === selectedAssigneeId),
    [users, selectedAssigneeId]
  );

  return (
    <View>
      <FormField
        name="title"
        control={control}
        label="Title"
        placeholder="What needs to be done?"
        error={errors.title?.message}
        required
      />
      <FormField
        name="description"
        control={control}
        label="Description"
        placeholder="Add more detail (optional)"
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: "top" }}
        error={errors.description?.message}
      />

      <FormPicker
        name="projectId"
        control={control}
        label="Project"
        placeholder="Default project"
        items={projectItems}
        enabled={!projectLocked}
        error={errors.projectId?.message}
        required={false}
      />
      <FormPicker
        name="statusKey"
        control={control}
        label={statusesLoading ? "Status (loading…)" : "Status"}
        placeholder="Select status"
        items={statusItems}
        enabled={!statusesLoading && statusItems.length > 0}
        error={errors.statusKey?.message}
        required
      />
      <FormPicker
        name="assigneeId"
        control={control}
        label="Assignee"
        placeholder="Search by name or designation"
        items={userItems}
        error={errors.assigneeId?.message}
        required={false}
      />

      {selectedAssignee && (
        <View className="-mt-2 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
          <Text className="text-[11px] text-gray-400 mb-1">
            Assignee details (read-only)
          </Text>
          <ReadOnlyRow label="Company" value={selectedAssignee.companyName} />
          <ReadOnlyRow label="Department" value={selectedAssignee.departmentName} />
          <ReadOnlyRow label="Designation" value={selectedAssignee.designationName} />
          {!!selectedAssignee.groupName && (
            <ReadOnlyRow label="Group" value={selectedAssignee.groupName} />
          )}
        </View>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormPicker
            name="priority"
            control={control}
            label="Priority"
            items={PRIORITY_ITEMS}
            error={errors.priority?.message}
            required
          />
        </View>
        <View className="flex-1">
          <FormPicker
            name="type"
            control={control}
            label="Type"
            items={TYPE_ITEMS}
            error={errors.type?.message}
            required
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormDateField
            name="startDate"
            control={control}
            label="Start date"
            error={errors.startDate?.message}
          />
        </View>
        <View className="flex-1">
          <FormDateField
            name="dueDate"
            control={control}
            label="Due date"
            error={errors.dueDate?.message}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            name="estimate"
            control={control}
            label="Estimate"
            placeholder="2w 4d 6h"
            autoCapitalize="none"
            error={errors.estimate?.message}
          />
        </View>
        <View className="flex-1">
          <FormField
            name="spent"
            control={control}
            label="Time spent"
            placeholder="3h 30m"
            autoCapitalize="none"
            error={errors.spent?.message}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className={`rounded-lg py-4 items-center mt-2 ${
          isSubmitting ? "bg-indigo-300" : "bg-indigo-600"
        }`}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-lg">{submitLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
