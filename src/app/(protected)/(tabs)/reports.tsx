import { NotificationBell } from "@/features/notifications";
import { useUserProjects } from "@/features/projects";
import { useRangeReport, useReportScope } from "@/features/reports";
import { formatDuration } from "@/lib/duration";
import { Ionicons } from "@expo/vector-icons";
import { ThemedStatusBar } from "@/components/themed-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "task" | "project";

const fmtTime = (s: number) => formatDuration(Math.round((s || 0) / 60)) || "0h";
const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ReportsScreen() {
  const [tab, setTab] = useState<Tab>("task");

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ThemedStatusBar />
      <View className="bg-indigo-600 px-5 pt-5 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-bold">Reports</Text>
          <NotificationBell />
        </View>
        <View className="flex-row mt-3 bg-white/15 rounded-lg p-1">
          {(["task", "project"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-2 rounded-md ${tab === t ? "bg-white" : ""}`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  tab === t ? "text-indigo-700" : "text-white"
                }`}
              >
                {t === "task" ? "Task Report" : "Project Report"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === "task" ? <TaskReport /> : <ProjectReport />}
    </SafeAreaView>
  );
}

// --------------------------- single date field -----------------------------
function DateField({
  label,
  value,
  onChange,
  maxDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1">
      <Text className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5"
      >
        <Ionicons name="calendar-outline" size={16} color="#4f46e5" />
        <Text
          className={`flex-1 ml-2 text-sm ${
            value ? "text-gray-900 dark:text-gray-100" : "text-gray-400"
          }`}
        >
          {value || "Select date"}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable
            className="bg-white dark:bg-gray-900 rounded-t-2xl p-4"
            style={{ paddingBottom: insets.bottom + 16 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {label}
            </Text>
            <Calendar
              current={value || undefined}
              maxDate={maxDate}
              markedDates={value ? { [value]: { selected: true, selectedColor: "#4f46e5" } } : {}}
              onDayPress={(d) => {
                onChange(d.dateString);
                setOpen(false);
              }}
              theme={{ todayTextColor: "#4f46e5", arrowColor: "#4f46e5" }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ----------------------------- Task Report ---------------------------------
function TaskReport() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [applied, setApplied] = useState<{ start: string; end: string } | null>(null);
  const [err, setErr] = useState("");

  const { data: scope = [] } = useReportScope();
  const { data: rows, isLoading, isError, error } = useRangeReport(
    applied?.start ?? "",
    applied?.end ?? "",
    scope,
    !!applied
  );

  const generate = () => {
    if (!start || !end) {
      setErr("Pick both From and To dates.");
      return;
    }
    if (new Date(start) > new Date(end)) {
      setErr("From date cannot be after To date.");
      return;
    }
    setErr("");
    setApplied({ start, end });
  };

  const clear = () => {
    setStart("");
    setEnd("");
    setApplied(null);
    setErr("");
  };

  return (
    <>
      <View className="px-4 py-3">
        <View className="flex-row gap-3">
          <DateField label="From" value={start} onChange={setStart} maxDate={TODAY()} />
          <DateField label="To" value={end} onChange={setEnd} maxDate={TODAY()} />
        </View>
        {!!err && <Text className="text-red-500 text-sm mt-1">{err}</Text>}
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={generate}
            className="flex-1 bg-indigo-600 rounded-lg py-2.5 items-center"
          >
            <Text className="text-white font-medium">Generate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={clear}
            className="px-4 rounded-lg py-2.5 items-center justify-center border border-gray-300 dark:border-gray-600"
          >
            <Text className="text-gray-700 dark:text-gray-200 font-medium">Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!applied ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
          <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center">
            Pick From and To dates, then Generate.
          </Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text className="text-gray-500 dark:text-gray-400 mt-3">Generating report…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load report"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          renderItem={({ item }) => {
            const variance = item.estimatedSeconds - item.spentSeconds;
            const varColor =
              variance > 0
                ? "text-green-600 dark:text-green-400"
                : variance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500";
            const varText =
              (variance > 0 ? "+" : variance < 0 ? "-" : "") +
              (formatDuration(Math.round(Math.abs(variance) / 60)) || "0h");
            return (
              <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-2.5 border border-gray-100 dark:border-gray-700">
                <Text className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {item.displayName}
                </Text>
                <View className="flex-row flex-wrap">
                  <Stat label="Assigned" value={`${item.assignedCount}`} />
                  <Stat label="Completed" value={`${item.completedCount}`} />
                  <Stat label="Estimated" value={fmtTime(item.estimatedSeconds)} />
                  <Stat label="Spent" value={fmtTime(item.spentSeconds)} />
                  <Stat label="Variance" value={varText} valueClass={varColor} />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-gray-500 dark:text-gray-400">No members in scope</Text>
            </View>
          }
        />
      )}
    </>
  );
}

// --------------------------- Project Report (user-wise) --------------------
function ProjectReport() {
  const { data: people = [], isLoading } = useReportScope();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <FlatList
      data={people}
      keyExtractor={(p) => p.userId}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => <UserProjectsCard {...item} />}
      ListEmptyComponent={
        <View className="items-center py-20">
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text className="text-gray-500 dark:text-gray-400 mt-3">No users in scope</Text>
        </View>
      }
    />
  );
}

function UserProjectsCard({
  userId,
  displayName,
  email,
}: {
  userId: string;
  displayName: string;
  email: string;
}) {
  const { data: projects = [], isLoading } = useUserProjects(userId);

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-2.5 border border-gray-100 dark:border-gray-700">
      <View className="flex-row items-center">
        <View className="h-9 w-9 rounded-full bg-indigo-500 items-center justify-center">
          <Text className="text-[11px] font-bold text-white">
            {displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-gray-900 dark:text-gray-100">{displayName}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{email}</Text>
        </View>
        <View className="bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
          <Text className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4f46e5" className="mt-3 self-start" />
      ) : projects.length === 0 ? (
        <Text className="text-xs text-gray-400 mt-3">No projects assigned</Text>
      ) : (
        <View className="mt-3 gap-1.5">
          {projects.map((p) => (
            <View key={p.id} className="flex-row items-center">
              <View className="h-6 px-1.5 rounded bg-cyan-100 dark:bg-cyan-900/40 items-center justify-center">
                <Text className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                  {p.key}
                </Text>
              </View>
              <Text className="text-sm text-gray-800 dark:text-gray-200 ml-2" numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <View className="w-1/3 mb-2">
      <Text className="text-[11px] text-gray-500 dark:text-gray-400">{label}</Text>
      <Text
        className={`text-sm font-medium ${valueClass ?? "text-gray-900 dark:text-gray-100"}`}
      >
        {value}
      </Text>
    </View>
  );
}
