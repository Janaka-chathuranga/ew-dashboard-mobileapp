import { FormField } from "@/components/form-field";
import { FormPicker } from "@/components/form-picker";
import { useSession } from "@/context/auth-context";
import {
  createUserSchema,
  useCreateUser,
  type CreateUserInput,
} from "@/features/admin";
import {
  setUserHeadDepartments,
  useCompanies,
  useDepartments,
  useDesignations,
  useGroups,
  useUserRoleOptions,
} from "@/features/org";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
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

export default function NewUserScreen() {
  const router = useRouter();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  // Heads with can_create_users may also create users (and set flags) for their
  // own departments — the Edge Function re-checks scope server-side.
  const canSetFlags = isAdmin || !!user?.canCreateUsers;
  const allowed = !!user?.canAccessConsole || isAdmin || !!user?.canCreateUsers;
  const createUser = useCreateUser();

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
  // Departments this user heads (only meaningful when role = head; admin only).
  const [headDeptIds, setHeadDeptIds] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: "",
      emailAddress: "",
      password: "",
      roleId: "", // set to the Member master-role id once the master loads
      companyId: "",
      departmentId: "",
      groupId: "",
      designationId: "",
    },
  });

  const companyId = watch("companyId");
  const departmentId = watch("departmentId");
  const roleId = watch("roleId");

  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments(companyId || undefined);
  const { data: groups = [] } = useGroups(departmentId || undefined);
  const { data: designations = [] } = useDesignations();
  const { data: allDepartments = [] } = useDepartments();
  const { data: userRoleOpts = [] } = useUserRoleOptions();

  // Role options come from the roles master (scope user|both), keyed by the
  // master role id so custom user roles are selectable. `roleValue` is the
  // permission level used for gating. Fallback enum list until the master loads.
  const baseRoleOptions = userRoleOpts.length
    ? userRoleOpts.map((r) => ({ value: r.id, label: r.name, roleValue: r.roleValue }))
    : FALLBACK_ROLE_OPTIONS;
  // Never let a non-admin assign admin/head.
  const roleOptions = isAdmin
    ? baseRoleOptions
    : baseRoleOptions.filter((r) => r.roleValue !== "admin" && r.roleValue !== "head");
  const roleItems = roleOptions.map((r) => ({ label: r.label, value: r.value }));
  // The Member role id, used as the default selection for new users.
  const defaultRoleId =
    baseRoleOptions.find((r) => r.roleValue === "member")?.value ??
    baseRoleOptions[0]?.value ??
    "";
  // Permission level of the selected role (drives the head-only departments UI).
  const selectedRoleValue =
    baseRoleOptions.find((r) => r.value === roleId)?.roleValue ?? null;

  // Default to the Member role once the master loads (roleId starts empty).
  useEffect(() => {
    if (!roleId && defaultRoleId) setValue("roleId", defaultRoleId);
  }, [roleId, defaultRoleId, setValue]);

  // Reset dependent pickers when the parent changes.
  useEffect(() => {
    setValue("departmentId", "");
    setValue("groupId", "");
  }, [companyId, setValue]);
  useEffect(() => {
    setValue("groupId", "");
  }, [departmentId, setValue]);

  if (user && !allowed) {
    return <Redirect href="/(protected)/(tabs)/profile" />;
  }

  const onSubmit = (values: CreateUserInput) => {
    createUser.mutate(
      {
        displayName: values.displayName,
        emailAddress: values.emailAddress,
        password: values.password,
        roleId: values.roleId,
        companyId: values.companyId || null,
        departmentId: values.departmentId || null,
        groupId: values.groupId || null,
        designationId: values.designationId || null,
        // Admins and heads-with-can_create_users may set flags; the Edge
        // Function still rejects out-of-scope writes and role escalation.
        ...(canSetFlags ? flags : {}),
      },
      {
        onSuccess: async (data: any) => {
          // Multi-department-head assignment is an admin-only, RLS-gated write.
          if (isAdmin && selectedRoleValue === "head" && data?.accountId) {
            try {
              await setUserHeadDepartments(data.accountId, headDeptIds);
            } catch (e) {
              Alert.alert(
                "User created, but head departments failed",
                e instanceof Error ? e.message : "Unknown error"
              );
              router.back();
              return;
            }
          }
          Alert.alert("User created", `${values.displayName} was added.`);
          router.back();
        },
        onError: (e) =>
          Alert.alert(
            "Could not create user",
            e instanceof Error ? e.message : "Unknown error"
          ),
      }
    );
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
          New User
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
          <FormField
            name="displayName"
            control={control}
            label="Full Name"
            placeholder="User's name"
            error={errors.displayName?.message}
            required
          />
          <FormField
            name="emailAddress"
            control={control}
            label="Email"
            placeholder="user@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.emailAddress?.message}
            required
          />
          <FormField
            name="password"
            control={control}
            label="Temporary Password"
            placeholder="At least 8 characters"
            secureTextEntry
            error={errors.password?.message}
            required
          />
          <FormPicker
            name="roleId"
            control={control}
            label="Role"
            items={roleItems}
            error={errors.roleId?.message}
            required
          />
          <FormPicker
            name="companyId"
            control={control}
            label="Company"
            placeholder="Select company"
            items={companies.map((c) => ({ label: c.name, value: c.id }))}
            required={false}
          />
          <FormPicker
            name="departmentId"
            control={control}
            label="Department"
            placeholder="Select department"
            items={departments.map((d) => ({ label: d.name, value: d.id }))}
            enabled={!!companyId}
            required={false}
          />
          <FormPicker
            name="groupId"
            control={control}
            label="Group"
            placeholder="Select group"
            items={groups.map((g) => ({ label: g.name, value: g.id }))}
            enabled={!!departmentId}
            required={false}
          />
          <FormPicker
            name="designationId"
            control={control}
            label="Designation"
            placeholder="Select designation"
            items={designations.map((d) => ({ label: d.name, value: d.id }))}
            required={false}
          />

          {isAdmin && selectedRoleValue === "head" && (
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                Head of Departments
              </Text>
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
                              v ? [...prev, d.id] : prev.filter((id) => id !== d.id)
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
              <Text className="text-gray-700 mb-2 font-medium">Permissions</Text>
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
            onPress={handleSubmit(onSubmit)}
            disabled={createUser.isPending}
            className={`rounded-lg py-4 items-center mt-2 ${
              createUser.isPending ? "bg-indigo-300" : "bg-indigo-600"
            }`}
          >
            {createUser.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Create User
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
