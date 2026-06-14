import { priorityPill, typeVisual } from "@/features/issues";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { BoardIssue } from "../api/board";

export function BoardCard({
  issue,
  onPress,
  onMove,
  canMove,
}: {
  issue: BoardIssue;
  onPress: () => void;
  onMove: () => void;
  canMove: boolean;
}) {
  const type = typeVisual(issue.type);
  const prio = priorityPill(issue.priority);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={canMove ? onMove : undefined}
      activeOpacity={0.7}
      className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-2.5 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center mb-1.5">
        <Ionicons name={type.icon} size={14} color={type.color} />
        <Text className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-1">
          {issue.key}
        </Text>
        <View className="flex-1" />
        {canMove && (
          <TouchableOpacity onPress={onMove} hitSlop={8} className="ml-1">
            <Ionicons name="swap-horizontal" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <Text
        className="text-sm text-gray-900 dark:text-gray-100"
        numberOfLines={3}
      >
        {issue.title}
      </Text>

      <View className="flex-row items-center mt-2">
        <View className={`px-1.5 py-0.5 rounded ${prio.bg}`}>
          <Text className={`text-[10px] font-medium capitalize ${prio.text}`}>
            {issue.priority}
          </Text>
        </View>
        <View className="flex-1" />
        {issue.assignees[0] ? (
          <View className="h-5 w-5 rounded-full bg-indigo-500 items-center justify-center">
            <Text className="text-[9px] font-bold text-white">
              {issue.assignees[0].displayName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Text>
          </View>
        ) : (
          <Ionicons name="person-circle-outline" size={20} color="#D1D5DB" />
        )}
      </View>
    </TouchableOpacity>
  );
}
