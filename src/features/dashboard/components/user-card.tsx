import { formatDuration } from "@/lib/duration";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import type { TeamMemberCard } from "../hooks/use-team-dashboard";

/**
 * Time-aware status colour, ported from the web dashboard (getCardStatusColor):
 * the same completion rate looks worse later in the day. rate is 0..1; backlog
 * is the pending-backlog count.
 */
function cardStatusColor(rate: number, backlog: number): string {
  const hasBacklog = backlog > 0;
  const hour = new Date().getHours();
  const emerald =
    "border-l-4 border-l-emerald-600 bg-emerald-100 dark:bg-emerald-900/30";
  const rose = "border-l-4 border-l-rose-600 bg-rose-100 dark:bg-rose-900/30";
  const amber = "border-l-4 border-l-amber-600 bg-amber-100 dark:bg-amber-900/30";

  if (hour >= 17) {
    if (rate === 0 && backlog === 0) return emerald;
    if (rate === 1 && !hasBacklog) return emerald;
    return rose;
  }
  if (hour >= 15) {
    if (rate === 0 && backlog === 0) return emerald;
    if (rate < 0.5) return rose;
  }
  if (hour >= 12) {
    if (rate === 0 && backlog === 0) return emerald;
    if (rate < 0.5 && !hasBacklog) return amber;
    if (rate < 0.5 && hasBacklog) return rose;
  }
  if (rate === 0) return hasBacklog ? rose : emerald;
  if (rate > 0 && hasBacklog) return rose;
  if (rate > 0 && !hasBacklog) return emerald;
  return "";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function MiniStat({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View className="w-1/2 flex-row items-center py-1.5">
      <Ionicons name={icon} size={16} color={color} />
      <Text className="text-gray-500 dark:text-gray-400 text-xs ml-1.5 flex-1">
        {label}
      </Text>
      <Text className="text-gray-900 dark:text-gray-100 font-semibold text-sm">
        {value}
      </Text>
    </View>
  );
}

export function UserCard({
  card,
  onPress,
}: {
  card: TeamMemberCard;
  onPress?: () => void;
}) {
  const c = card.cats;
  const completed = c.dailyCompleted.length;
  const daily = c.dailyTasks.length;
  const inProgress = c.inProgressTasks.length;
  const pending = c.pendingBacklog.length;
  const denom = completed + daily + inProgress + pending;
  const percent = denom === 0 ? 0 : Math.round((completed / denom) * 100);

  const dailyEstimateMinutes = Math.round(
    c.activeSprintTodayTasks.reduce(
      (t, task) =>
        t + (task.fields.timetracking?.originalEstimateSeconds ?? 0) / 60,
      0
    )
  );
  const monthlySpentMinutes = Math.round(c.monthlySpentHours * 60);
  const statusColor = cardStatusColor(percent / 100, pending);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      className={`rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700 ${
        statusColor || "bg-white dark:bg-gray-800"
      }`}
    >
      {/* Header */}
      <View className="flex-row items-center">
        <View className="h-10 w-10 rounded-full bg-indigo-500 items-center justify-center">
          <Text className="text-xs font-bold text-white">
            {initials(card.displayName)}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-gray-900 dark:text-gray-100 font-semibold">
            {card.displayName}
          </Text>
          {!card.active && (
            <Text className="text-[10px] text-gray-400">Inactive</Text>
          )}
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
      </View>

      {/* Daily completion */}
      <View className="mt-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Daily Task Completion
          </Text>
          <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {percent}%
          </Text>
        </View>
        <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <View
            className="bg-indigo-500 h-2 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </View>
      </View>

      {/* Buckets */}
      <View className="flex-row flex-wrap mt-2">
        <MiniStat icon="ellipse-outline" color="#3b82f6" label="Daily" value={daily} />
        <MiniStat
          icon="time-outline"
          color="#f59e0b"
          label="In Progress"
          value={inProgress}
        />
        <MiniStat
          icon="checkmark-circle-outline"
          color="#22c55e"
          label="Done Today"
          value={completed}
        />
        <MiniStat
          icon="archive-outline"
          color="#6b7280"
          label="Backlog"
          value={pending}
        />
      </View>

      {/* Monthly footer */}
      <View className="flex-row flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Footer label="Monthly Assigned" value={`${c.monthlyAssigned.length}`} />
        <Footer label="Monthly Completed" value={`${c.monthlyCompleted.length}`} />
        <Footer
          label="Est. Daily"
          value={formatDuration(dailyEstimateMinutes) || "0h"}
        />
        <Footer
          label="Spent Monthly"
          value={formatDuration(monthlySpentMinutes) || "0h"}
        />
      </View>
    </TouchableOpacity>
  );
}

function Footer({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 mb-1">
      <Text className="text-[10px] text-gray-400">{label}</Text>
      <Text className="text-xs font-medium text-gray-800 dark:text-gray-200">
        {value}
      </Text>
    </View>
  );
}
