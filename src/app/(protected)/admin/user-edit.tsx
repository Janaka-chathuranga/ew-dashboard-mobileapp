import { SearchableSelect } from "@/components/searchable-select";
import { useSession } from "@/context/auth-context";
import {
  useAdminUsers,
  useDeleteUser,
  useUpdateUser,
  type UpdateUserPayload,
} from "@/features/admin";
import {
  setUserHeadDepartments,
  useCompanies,
  useDepartments,
  useDesignations,
  useGroups,
  useUserHeadDepartments,
  useUserRoleOptions,
} from "@/features/org";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  Redirect,
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Fallback used only until the roles master loads. Keyed by the user_role enum
// (value === roleValue) — the Edge Function's resolveRole accepts a bare enum
// for back-compat, so the form still works if the master is unreachable.
const FALLBACK_ROLE_OPTIONS = [
  { label: "Member", value: "member", roleValue: "member" },
  { label: "Team Lead", value: "team-lead", roleValue: "team-lead" },
  { label: "Department Head", value: "department-lead", roleValue: "department-lead" },
  { label: "Head", value: "head", roleValue: "head" },
  { label: "Admin", value: "admin", roleValue: "admin" },
];

const FLAGS = [
  { key: "canManageTasks", label: "Manage tasks" },
  { key: "canDeleteTasks", label: "Delete tasks" },
  { key: "canFilterDashboard", label: "Filter dashboard" },
  { key: "canAccessConsole", label: "Access console" },
  { key: "canCreateUsers", label: "Create users" },
  { key: "canCreateCompanies", label: "Create companies" },
  { key: "canCreateDepartments", label: "Create departments" },
  { key: "canCreateGroups", label: "Create groups" },
  { key: "canCreateDesignations", label: "Create designations" },
  { key: "canCreateRoles", label: "Create roles" },
  { key: "canCreateProjects", label: "Create projects" },
] as const;

type FlagKey = (typeof FLAGS)[number]["key"];

export default function EditUserScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  // Heads with can_create_users may edit users (incl. permission flags) in their
  // own departments; the Edge Function re-checks scope and blocks escalation.
  const canSetFlags = isAdmin || !!user?.canCreateUsers;
  const allowed = !!user?.canAccessConsole || isAdmin || !!user?.canCreateUsers;

  const { data: users } = useAdminUsers();
  const target = useMemo(
    () => users?.find((u) => u.accountId === id),
    [users, id]
  );
  const { data: existingHeadDepts } = useUserHeadDepartments(
    isAdmin ? id : undefined
  );

  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("member");
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [active, setActive] = useState(true);
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
    canManageTasks: false,
    canDeleteTasks: false,
    canFilterDashboard: false,
    canAccessConsole: false,
    canCreateUsers: false,
    canCreateCompanies: false,
    canCreateDepartments: false,
    canCreateGroups: false,
    canCreateDesignations: false,
    canCreateRoles: false,
    canCreateProjects: false,
  });
  const [headDeptIds, setHeadDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed the form once the target user loads.
  useEffect(() => {
    if (!target) return;
    setDisplayName(target.displayName);
    setEmail(target.emailAddress);
    // roleId is seeded from the master role in a dedicated effect below.
    setCompanyId(target.companyId ?? "");
    setDepartmentId(target.departmentId ?? "");
    setGroupId(target.groupId ?? "");
    setDesignationId(target.designationId ?? "");
    setActive(target.active);
    setFlags({
      canManageTasks: target.canManageTasks,
      canDeleteTasks: target.canDeleteTasks,
      canFilterDashboard: target.canFilterDashboard,
      canAccessConsole: target.canAccessConsole,
      canCreateUsers: target.canCreateUsers,
      canCreateCompanies: target.canCreateCompanies,
      canCreateDepartments: target.canCreateDepartments,
      canCreateGroups: target.canCreateGroups,
      canCreateDesignations: target.canCreateDesignations,
      canCreateRoles: target.canCreateRoles,
      canCreateProjects: target.canCreateProjects,
    });
  }, [target]);

  useEffect(() => {
    if (existingHeadDepts) setHeadDeptIds(existingHeadDepts);
  }, [existingHeadDepts]);

  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments(companyId || undefined);
  const { data: groups = [] } = useGroups(departmentId || undefined);
  const { data: designations = [] } = useDesignations();
  const { data: allDepartments = [] } = useDepartments();
  const { data: userRoleOpts = [] } = useUserRoleOptions();

  // Role options come from the roles master (scope user|both), keyed by master
  // role id; `roleValue` is the permission level used for gating. Fallback enum
  // list until the master loads.
  const baseRoleOptions = userRoleOpts.length
    ? userRoleOpts.map((r) => ({ value: r.id, label: r.name, roleValue: r.roleValue }))
    : FALLBACK_ROLE_OPTIONS;
  const defaultRoleId =
    baseRoleOptions.find((r) => r.roleValue === "member")?.value ??
    baseRoleOptions[0]?.value ??
    "";

  // Seed/repair the role selection once the options resolve. Prefers the stored
  // master role (role_id); falls back to a role at the same permission level,
  // then to Member. Runs whenever the current selection isn't a valid option.
  useEffect(() => {
    if (!target) return;
    if (baseRoleOptions.some((r) => r.value === roleId)) return;
    const seeded =
      target.roleRecordId ??
      baseRoleOptions.find((r) => r.roleValue === target.roleId)?.value ??
      defaultRoleId;
    if (seeded && seeded !== roleId) setRoleId(seeded);
  }, [target, baseRoleOptions, roleId, defaultRoleId]);

  if (user && !allowed) {
    return <Redirect href="/(protected)/(tabs)/profile" />;
  }

  if (!target) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  // Never let a non-admin assign admin/head.
  const roleOptions = isAdmin
    ? baseRoleOptions
    : baseRoleOptions.filter((r) => r.roleValue !== "admin" && r.roleValue !== "head");
  const roleItems = roleOptions.map((r) => ({ label: r.label, value: r.value }));
  // Permission level of the selected role (drives the head-only departments UI).
  const selectedRoleValue =
    baseRoleOptions.find((r) => r.value === roleId)?.roleValue ?? null;

  const onSave = () => {
    if (!displayName.trim()) {
      Alert.alert("Required", "Name is required.");
      return;
    }
    const payload: UpdateUserPayload = {
      displayName: displayName.trim(),
      emailAddress: email.trim() || undefined,
      roleId,
      companyId: companyId || null,
      departmentId: departmentId || null,
      groupId: groupId || null,
      designationId: designationId || null,
      active,
      ...(canSetFlags ? flags : {}),
    };
    setSaving(true);
    updateUser.mutate(
      { accountId: target.accountId, payload },
      {
        onSuccess: async () => {
          try {
            if (isAdmin) {
              // Keep head assignments in sync; clear them if no longer a head.
              await setUserHeadDepartments(
                target.accountId,
                selectedRoleValue === "head" ? headDeptIds : []
              );
              queryClient.invalidateQueries({
                queryKey: ["head-departments", target.accountId],
              });
              queryClient.invalidateQueries({ queryKey: ["my-scope-departments"] });
            }
          } catch (e) {
            setSaving(false);
            Alert.alert(
              "Saved, but head departments failed",
              e instanceof Error ? e.message : "Unknown error"
            );
            return;
          }
          setSaving(false);
          Alert.alert("Saved", `${displayName} was updated.`);
          router.back();
        },
        onError: (e) => {
          setSaving(false);
          Alert.alert("Update failed", e instanceof Error ? e.message : "Error");
        },
      }
    );
  };

  const onDelete = () => {
    Alert.alert("Delete user", `Delete ${target.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteUser.mutate(target.accountId, {
            onSuccess: () => router.back(),
            onError: (e) =>
              Alert.alert(
                "Delete failed",
                e instanceof Error ? e.message : "Error"
              ),
          }),
      },
    ]);
  };

  const Label = ({ text }: { text: string }) => (
    <Text className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
      {text}
    </Text>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          Edit User
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4">
          <Label text="Full Name" />
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100"
          />
        </View>
        <View className="mb-4">
          <Label text="Email" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100"
          />
        </View>

        <View className="mb-4">
          <Label text="Role" />
          <SearchableSelect
            value={roleId}
            onChange={setRoleId}
            options={roleItems}
            allowClear={false}
          />
        </View>

        <View className="mb-4">
          <Label text="Company" />
          <SearchableSelect
            value={companyId}
            onChange={(v) => {
              setCompanyId(v);
              setDepartmentId("");
              setGroupId("");
            }}
            options={companies.map((c) => ({ label: c.name, value: c.id }))}
            placeholder="Select company"
          />
        </View>

        <View className="mb-4">
          <Label text="Department" />
          <SearchableSelect
            value={departmentId}
            onChange={(v) => {
              setDepartmentId(v);
              setGroupId("");
            }}
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
            placeholder="Select department"
          />
        </View>

        <View className="mb-4">
          <Label text="Group" />
          <SearchableSelect
            value={groupId}
            onChange={setGroupId}
            options={groups.map((g) => ({ label: g.name, value: g.id }))}
            placeholder="Select group"
            enabled={!!departmentId}
          />
        </View>

        <View className="mb-4">
          <Label text="Designation" />
          <SearchableSelect
            value={designationId}
            onChange={setDesignationId}
            options={designations.map((d) => ({ label: d.name, value: d.id }))}
            placeholder="Select designation"
          />
        </View>

        <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 mb-4">
          <Text className="text-gray-800 dark:text-gray-100">Active</Text>
          <Switch
            value={active}
            onValueChange={setActive}
            disabled={!canSetFlags}
          />
        </View>

        {isAdmin && selectedRoleValue === "head" && (
          <View className="mb-4">
            <Label text="Head of Departments" />
            <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {allDepartments.length === 0 ? (
                <Text className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  No departments yet.
                </Text>
              ) : (
                allDepartments.map((d, i) => {
                  const on = headDeptIds.includes(d.id);
                  return (
                    <View
                      key={d.id}
                      className={`flex-row items-center justify-between px-4 py-3 ${
                        i < allDepartments.length - 1
                          ? "border-b border-gray-100 dark:border-gray-700"
                          : ""
                      }`}
                    >
                      <Text className="text-gray-800 dark:text-gray-100 flex-1">
                        {d.name}
                      </Text>
                      <Switch
                        value={on}
                        onValueChange={(v) =>
                          setHeadDeptIds((prev) =>
                            v ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                          )
                        }
                      />
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {canSetFlags && (
          <View className="mb-4">
            <Label text="Permissions" />
            <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {FLAGS.map((f, i) => (
                <View
                  key={f.key}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    i < FLAGS.length - 1
                      ? "border-b border-gray-100 dark:border-gray-700"
                      : ""
                  }`}
                >
                  <Text className="text-gray-800 dark:text-gray-100">
                    {f.label}
                  </Text>
                  <Switch
                    value={flags[f.key]}
                    onValueChange={(v) =>
                      setFlags((prev) => ({ ...prev, [f.key]: v }))
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={onSave}
          disabled={saving || updateUser.isPending}
          className={`rounded-lg py-4 items-center mt-2 ${
            saving || updateUser.isPending ? "bg-indigo-300" : "bg-indigo-600"
          }`}
        >
          {saving || updateUser.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          disabled={deleteUser.isPending}
          className="rounded-lg py-4 items-center mt-3 border border-red-300"
        >
          <Text className="text-red-600 font-semibold">Delete User</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
