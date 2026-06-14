import { SearchableSelect } from "@/components/searchable-select";
import { useSession } from "@/context/auth-context";
import { useRolesFull } from "@/features/org";
import {
  useAddProjectMember,
  useProject,
  useProjectMembers,
  useRemoveProjectMember,
} from "@/features/projects";
import { useUsers } from "@/features/users/api/users";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

function MemberInfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-xs text-gray-800 dark:text-gray-200 font-medium">
        {value || "—"}
      </Text>
    </View>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const canManage = user?.role === "admin" || !!user?.canManageTasks;

  const project = useProject(id);
  const { data: members, isLoading } = useProjectMembers(id);
  const { data: users = [] } = useUsers();
  const { data: roles = [] } = useRolesFull();
  const addMember = useAddProjectMember(id);
  const removeMember = useRemoveProjectMember(id);

  const [addOpen, setAddOpen] = useState(false);
  const [pickUser, setPickUser] = useState("");
  const [pickRole, setPickRole] = useState("");

  // Project-member role choices from the Roles master (scope project|both;
  // value = role name, stored as-is on project_members.role).
  const projectRoles = useMemo(
    () => roles.filter((r) => r.scope === "project" || r.scope === "both"),
    [roles]
  );
  const roleOptions = useMemo(
    () => projectRoles.map((r) => ({ label: r.name, value: r.name })),
    [projectRoles]
  );
  const defaultRole =
    projectRoles.find((r) => r.name === "Member")?.name ?? projectRoles[0]?.name ?? "";

  const openAdd = () => {
    setPickUser("");
    setPickRole(defaultRole);
    setAddOpen(true);
  };

  // Only users not already on the project are addable. Designation is shown as
  // the option sub-line and included in the search.
  const candidates = useMemo(() => {
    const existing = new Set((members ?? []).map((m) => m.userId));
    return users
      .filter((u) => !existing.has(u.id))
      .map((u) => ({
        label: u.displayName,
        value: u.id,
        description: u.designationName ?? undefined,
      }));
  }, [users, members]);

  const pickedUser = useMemo(
    () => users.find((u) => u.id === pickUser),
    [users, pickUser]
  );

  const submitAdd = () => {
    if (!pickUser) {
      Alert.alert("Select a user", "Choose a user to add.");
      return;
    }
    const role = pickRole || defaultRole || "member";
    addMember.mutate(
      { userId: pickUser, role },
      {
        onSuccess: () => {
          setAddOpen(false);
          setPickUser("");
          setPickRole(defaultRole);
          Alert.alert("Success", "Member added to the project.");
        },
        onError: (e) =>
          Alert.alert("Could not add member", e instanceof Error ? e.message : "Error"),
      }
    );
  };

  const confirmRemove = (userId: string, name: string) => {
    Alert.alert("Remove member", `Remove ${name} from this project?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          removeMember.mutate(userId, {
            onSuccess: () => Alert.alert("Success", "Member removed."),
            onError: (e) =>
              Alert.alert("Remove failed", e instanceof Error ? e.message : "Error"),
          }),
      },
    ]);
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
          {project?.key ?? "Project"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {project?.name ?? "Project"}
        </Text>
        {!!project?.description && (
          <Text className="text-gray-600 dark:text-gray-300 mt-2">
            {project.description}
          </Text>
        )}

        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {members?.length ?? project?.memberCount ?? 0}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">Members</Text>
          </View>
          <View className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {project?.issueCount ?? 0}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tasks</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-6 mb-2">
          <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Members
          </Text>
          {canManage && (
            <TouchableOpacity
              onPress={openAdd}
              className="flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-lg"
            >
              <Ionicons name="person-add" size={15} color="white" />
              <Text className="text-white font-medium ml-1 text-sm">Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#4f46e5" className="mt-4" />
        ) : (
          <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            {(members ?? []).map((m, i) => (
              <View
                key={m.userId}
                className={`flex-row items-center p-3.5 ${
                  i < (members?.length ?? 0) - 1
                    ? "border-b border-gray-100 dark:border-gray-700"
                    : ""
                }`}
              >
                <View className="h-9 w-9 rounded-full bg-indigo-500 items-center justify-center">
                  <Text className="text-[11px] font-bold text-white">
                    {m.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 dark:text-gray-100 font-medium">
                    {m.displayName}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{m.email}</Text>
                </View>
                <View className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                    {m.role}
                  </Text>
                </View>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => confirmRemove(m.userId, m.displayName)}
                    className="p-1.5 ml-1"
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {(members?.length ?? 0) === 0 && (
              <Text className="text-gray-500 dark:text-gray-400 text-center p-4">
                No members
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add member sheet */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40 px-3"
          style={{ paddingTop: insets.top + 12 }}
          onPress={() => setAddOpen(false)}
        >
          <Pressable
            className="bg-white dark:bg-gray-900 rounded-2xl p-5"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add Member
            </Text>
            <Text className="text-gray-700 dark:text-gray-300 mb-2 font-medium">User</Text>
            <SearchableSelect
              value={pickUser}
              onChange={setPickUser}
              options={candidates}
              placeholder="Search by name or designation"
            />

            {pickedUser && (
              <View className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                <Text className="text-[11px] text-gray-400 mb-1">
                  User details (read-only)
                </Text>
                <MemberInfoRow label="Company" value={pickedUser.companyName} />
                <MemberInfoRow label="Department" value={pickedUser.departmentName} />
                <MemberInfoRow label="Designation" value={pickedUser.designationName} />
                {!!pickedUser.groupName && (
                  <MemberInfoRow label="Group" value={pickedUser.groupName} />
                )}
              </View>
            )}

            <Text className="text-gray-700 dark:text-gray-300 mb-2 mt-4 font-medium">Role</Text>
            <SearchableSelect
              value={pickRole}
              onChange={setPickRole}
              options={roleOptions}
              placeholder="Select role"
              allowClear={false}
            />
            <TouchableOpacity
              onPress={submitAdd}
              disabled={addMember.isPending}
              className={`rounded-lg py-4 items-center mt-5 ${
                addMember.isPending ? "bg-indigo-300" : "bg-indigo-600"
              }`}
            >
              {addMember.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Add to Project</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
