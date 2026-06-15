import { useSession } from "@/context/auth-context";
import { useAllIssues } from "@/features/issues";
import { NotificationBell } from "@/features/notifications";
import {
  useCompaniesFull,
  useDepartmentsFull,
  useDesignationsFull,
  useGroupsFull,
  useMyScopeDepartments,
  useRolesFull,
} from "@/features/org";
import { useProjects } from "@/features/projects";
import { useAdminUsers } from "@/features/admin";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { ThemedStatusBar } from "@/components/themed-status-bar";
import { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MasterCard {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  count?: number;
  href: Href;
  show: boolean;
}

export default function MastersScreen() {
  const router = useRouter();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const isHeadLike =
    isAdmin || user?.role === "head" || user?.role === "department-lead";

  const companies = useCompaniesFull();
  const departments = useDepartmentsFull();
  const groups = useGroupsFull();
  const designations = useDesignationsFull();
  const roles = useRolesFull();
  const users = useAdminUsers();
  const projects = useProjects();
  const issues = useAllIssues();
  const { data: scopeDepts = [] } = useMyScopeDepartments();

  // Heads see a department-scoped user count; admins see everyone.
  const userCount = useMemo(() => {
    const list = users.data ?? [];
    if (isAdmin) return list.length;
    const set = new Set(scopeDepts);
    return list.filter((u) => u.departmentId && set.has(u.departmentId)).length;
  }, [users.data, isAdmin, scopeDepts]);

  const cards: MasterCard[] = [
    {
      label: "Companies",
      icon: "business-outline",
      color: "#4f46e5",
      bg: "bg-indigo-100 dark:bg-indigo-900/40",
      count: companies.data?.length ?? 0,
      href: "/admin/companies",
      show: isAdmin || !!user?.canCreateCompanies,
    },
    {
      label: "Departments",
      icon: "git-branch-outline",
      color: "#9333ea",
      bg: "bg-purple-100 dark:bg-purple-900/40",
      count: departments.data?.length ?? 0,
      href: "/admin/departments",
      show: isAdmin || !!user?.canCreateDepartments,
    },
    {
      label: "Groups",
      icon: "grid-outline",
      color: "#db2777",
      bg: "bg-pink-100 dark:bg-pink-900/40",
      count: groups.data?.length ?? 0,
      href: "/admin/groups",
      show: isAdmin || !!user?.canCreateGroups,
    },
    {
      label: "Designations",
      icon: "ribbon-outline",
      color: "#7c3aed",
      bg: "bg-violet-100 dark:bg-violet-900/40",
      count: designations.data?.length ?? 0,
      href: "/admin/designations",
      show: isAdmin || !!user?.canCreateDesignations,
    },
    {
      label: "Roles",
      icon: "shield-checkmark-outline",
      color: "#ca8a04",
      bg: "bg-yellow-100 dark:bg-yellow-900/40",
      count: roles.data?.length ?? 0,
      href: "/admin/roles",
      show: isAdmin || !!user?.canCreateRoles,
    },
    {
      label: "Users",
      icon: "people-outline",
      color: "#059669",
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
      count: userCount,
      href: "/admin/users",
      show: isAdmin || !!user?.canAccessConsole || isHeadLike,
    },
    {
      label: "Projects",
      icon: "folder-outline",
      color: "#0891b2",
      bg: "bg-cyan-100 dark:bg-cyan-900/40",
      count: projects.data?.length ?? 0,
      href: "/projects",
      show: isAdmin || !!user?.canManageTasks || !!user?.canCreateProjects,
    },
    {
      label: "Tasks",
      icon: "clipboard-outline",
      color: "#d97706",
      bg: "bg-amber-100 dark:bg-amber-900/40",
      count: issues.data?.length ?? 0,
      href: "/task-list",
      show: true,
    },
    {
      label: "Audit Log",
      icon: "document-text-outline",
      color: "#475569",
      bg: "bg-slate-100 dark:bg-slate-800",
      href: "/audit",
      show: isAdmin || !!user?.canAccessConsole,
    },
  ];

  const visible = cards.filter((c) => c.show);

  const refetchAll = () => {
    companies.refetch();
    departments.refetch();
    groups.refetch();
    designations.refetch();
    roles.refetch();
    users.refetch();
    projects.refetch();
    issues.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ThemedStatusBar />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={issues.isRefetching} onRefresh={refetchAll} />
        }
      >
        <View className="bg-indigo-600 px-5 pt-6 pb-8 rounded-b-3xl">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-indigo-100 text-sm">Welcome back,</Text>
              <Text className="text-white text-2xl font-bold">
                {user?.displayName ?? "User"}
              </Text>
              <Text className="text-indigo-100 text-xs mt-1">
                {isAdmin
                  ? "Manage your organisation"
                  : "Your workspace at a glance"}
              </Text>
            </View>
            <NotificationBell />
          </View>
        </View>

        <View className="px-4 -mt-4 flex-row flex-wrap">
          {visible.map((c) => (
            <View key={c.label} className="w-1/2 p-1.5">
              <TouchableOpacity
                onPress={() => router.push(c.href)}
                activeOpacity={0.7}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700"
              >
                <View
                  className={`h-11 w-11 rounded-xl items-center justify-center ${c.bg}`}
                >
                  <Ionicons name={c.icon} size={22} color={c.color} />
                </View>
                <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-3">
                  {c.count ?? "—"}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {c.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
