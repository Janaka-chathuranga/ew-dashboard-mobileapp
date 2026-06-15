import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import type { JiraIssue } from "../types";
import { priorityPill, statusPill, typeVisual } from "../lib/visuals";

export function IssueCard({ issue }: { issue: JiraIssue }) {
  const router = useRouter();
  const f = issue.fields;
  const type = typeVisual(f.issuetype.name);
  const prio = priorityPill(f.priority.name);
  const status = statusPill(f.status.statusCategory.name);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/issues/${issue.id}`)}
      activeOpacity={0.7}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center mb-2">
        <Ionicons name={type.icon} size={16} color={type.color} />
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1.5">
          {issue.key}
        </Text>
        <View className="flex-1" />
        <View className={`px-2 py-0.5 rounded-full ${status.bg}`}>
          <Text className={`text-xs font-medium ${status.text}`}>
            {f.status.name}
          </Text>
        </View>
      </View>

      <Text
        className="text-base font-medium text-gray-900 dark:text-gray-100"
        numberOfLines={2}
      >
        {f.summary}
      </Text>

      <View className="flex-row items-center mt-3">
        <View className={`px-2 py-0.5 rounded-full ${prio.bg}`}>
          <Text className={`text-xs font-medium capitalize ${prio.text}`}>
            {f.priority.name}
          </Text>
        </View>
        {f.duedate && (
          <View className="flex-row items-center ml-3">
            <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
            <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {new Date(f.duedate).toLocaleDateString()}
            </Text>
          </View>
        )}
        <View className="flex-1" />
        {f.assignee ? (
          <View className="h-6 w-6 rounded-full bg-indigo-500 items-center justify-center">
            <Text className="text-[10px] font-bold text-white">
              {f.assignee.displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Text>
          </View>
        ) : (
          <Ionicons name="person-circle-outline" size={24} color="#D1D5DB" />
        )}
      </View>

      {issue.assignedBy && (
        <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
          Assigned by {issue.assignedBy.displayName}
        </Text>
      )}
    </TouchableOpacity>
  );
}
