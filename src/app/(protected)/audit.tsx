import { useSession } from "@/context/auth-context";
import {
  describeChanges,
  fieldLabel,
  useAuditLogs,
  type AuditEntry,
} from "@/features/audit";
import {
  useCompaniesFull,
  useDepartmentsFull,
  useDesignationsFull,
  useGroupsFull,
} from "@/features/org";
import { useProjects } from "@/features/projects";
import { useUsers } from "@/features/users";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const ACTION_VISUAL: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  insert: { icon: "add-circle-outline", color: "#059669", bg: "bg-emerald-100 dark:bg-emerald-900/40" },
  update: { icon: "create-outline", color: "#d97706", bg: "bg-amber-100 dark:bg-amber-900/40" },
  delete: { icon: "trash-outline", color: "#dc2626", bg: "bg-red-100 dark:bg-red-900/40" },
};

function visual(action: string) {
  return (
    ACTION_VISUAL[action] ?? {
      icon: "ellipse-outline" as const,
      color: "#6b7280",
      bg: "bg-gray-100 dark:bg-gray-800",
    }
  );
}

// Elapsed wall-clock time in the "2w 4d 6h 45m" format (w=weeks, d=days,
// h=hours, m=minutes; 1w=7d, 1d=24h). Shows all non-zero units.
function formatElapsed(iso: string): string {
  let mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  const w = Math.floor(mins / (7 * 24 * 60));
  mins -= w * 7 * 24 * 60;
  const d = Math.floor(mins / (24 * 60));
  mins -= d * 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins - h * 60;
  const parts: string[] = [];
  if (w) parts.push(`${w}w`);
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return `${parts.join(" ")} ago`;
}

function entityLabel(t: string) {
  return t.replace(/_/g, " ").replace(/s$/, "");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AuditScreen() {
  const router = useRouter();
  const { user } = useSession();
  const allowed = user?.role === "admin" || !!user?.canAccessConsole;
  const { data, isLoading, isError, error, refetch, isRefetching } = useAuditLogs();
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  // Resolve foreign-key UUIDs in the change detail to human-readable names.
  const { data: companies = [] } = useCompaniesFull();
  const { data: departments = [] } = useDepartmentsFull();
  const { data: groups = [] } = useGroupsFull();
  const { data: designations = [] } = useDesignationsFull();
  const { data: users = [] } = useUsers();
  const { data: projects = [] } = useProjects();

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.id, c.name);
    for (const d of departments) m.set(d.id, d.name);
    for (const g of groups) m.set(g.id, g.name);
    for (const d of designations) m.set(d.id, d.name);
    for (const u of users) m.set(u.id, u.displayName);
    for (const p of projects) m.set(p.id, `${p.key} · ${p.name}`);
    return m;
  }, [companies, departments, groups, designations, users, projects]);

  const resolve = useCallback(
    (v: string) => (UUID_RE.test(v) ? nameMap.get(v) ?? v : v),
    [nameMap]
  );

  if (user && !allowed) {
    return <Redirect href="/(protected)/(tabs)/profile" />;
  }

  const renderItem = ({ item }: { item: AuditEntry }) => {
    const v = visual(item.action);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setSelected(item)}
        className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-3.5 mb-2.5 border border-gray-100 dark:border-gray-700"
      >
        <View className={`h-9 w-9 rounded-lg items-center justify-center ${v.bg}`}>
          <Ionicons name={v.icon} size={18} color={v.color} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-gray-900 dark:text-gray-100">
            <Text className="font-semibold">{item.actorName}</Text>
            <Text className="text-gray-500 dark:text-gray-400"> {item.action}d </Text>
            <Text className="capitalize">{entityLabel(item.entityType)}</Text>
          </Text>
          <Text className="text-[11px] text-gray-400 mt-0.5">
            {formatElapsed(item.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          Audit Log
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load audit log"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center px-8">
                No activity recorded yet.
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      <AuditDetailModal
        entry={selected}
        resolve={resolve}
        onClose={() => setSelected(null)}
        onOpenIssue={(issueId) => {
          setSelected(null);
          router.push(`/issues/${issueId}`);
        }}
      />
    </SafeAreaView>
  );
}

function AuditDetailModal({
  entry,
  resolve,
  onClose,
  onOpenIssue,
}: {
  entry: AuditEntry | null;
  resolve: (value: string) => string;
  onClose: () => void;
  onOpenIssue: (issueId: string) => void;
}) {
  const changes = entry ? describeChanges(entry, resolve) : [];
  const isUpdate = entry?.action === "update";
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={!!entry}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40 px-3"
        style={{ paddingTop: insets.top + 12 }}
        onPress={onClose}
      >
        <Pressable
          className="bg-white dark:bg-gray-900 rounded-2xl max-h-[80%] overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {entry && (
            <>
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <View
                  className={`h-9 w-9 rounded-lg items-center justify-center ${
                    visual(entry.action).bg
                  }`}
                >
                  <Ionicons
                    name={visual(entry.action).icon}
                    size={18}
                    color={visual(entry.action).color}
                  />
                </View>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-3 flex-1 capitalize">
                  {entry.action}d {entityLabel(entry.entityType)}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Meta */}
                <View className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mb-3">
                  <MetaRow label="Changed by" value={entry.actorName} />
                  <MetaRow
                    label="Date & time"
                    value={new Date(entry.createdAt).toLocaleString()}
                  />
                  <MetaRow label="When" value={formatElapsed(entry.createdAt)} />
                  <MetaRow
                    label="Entity"
                    value={entityLabel(entry.entityType)}
                  />
                </View>

                {/* Changes */}
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  {isUpdate ? "CHANGES" : "DETAILS"}
                </Text>
                {changes.length === 0 ? (
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    No field-level detail recorded.
                  </Text>
                ) : (
                  changes.map((ch) => (
                    <View
                      key={ch.field}
                      className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2"
                    >
                      <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                        {fieldLabel(ch.field)}
                      </Text>
                      {isUpdate ? (
                        <View>
                          <View className="flex-row">
                            <Text className="text-[10px] font-semibold uppercase text-gray-400 w-10 mt-0.5">
                              From
                            </Text>
                            <Text className="flex-1 text-xs text-rose-600 dark:text-rose-400 line-through">
                              {ch.oldValue}
                            </Text>
                          </View>
                          <View className="flex-row mt-1">
                            <Text className="text-[10px] font-semibold uppercase text-gray-400 w-10 mt-0.5">
                              To
                            </Text>
                            <Text className="flex-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                              {ch.newValue}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text className="text-xs text-gray-800 dark:text-gray-200">
                          {entry.action === "delete" ? ch.oldValue : ch.newValue}
                        </Text>
                      )}
                    </View>
                  ))
                )}

                {!!entry.issueId && (
                  <TouchableOpacity
                    onPress={() => onOpenIssue(entry.issueId as string)}
                    className="flex-row items-center justify-center bg-indigo-600 rounded-lg py-3 mt-2"
                  >
                    <Ionicons name="open-outline" size={16} color="white" />
                    <Text className="text-white font-medium ml-2">
                      Open related task
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-xs text-gray-900 dark:text-gray-100 font-medium ml-3 flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}
