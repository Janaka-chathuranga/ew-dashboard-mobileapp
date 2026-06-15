import { useSession } from "@/context/auth-context";
import {
  isGroupInUse,
  OrgManagerScreen,
  useCreateGroup,
  useDeleteGroup,
  useDepartmentsFull,
  useGroupsFull,
  useUpdateGroup,
  type GroupRow,
  type ManagerField,
} from "@/features/org";
import { useUsers } from "@/features/users/api/users";
import { Redirect } from "expo-router";
import { useMemo } from "react";
import { Alert } from "react-native";

export default function GroupsScreen() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const canWrite = isAdmin || !!user?.canCreateGroups;

  const { data: departments = [] } = useDepartmentsFull();
  const { data: users = [] } = useUsers();
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useGroupsFull();
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const remove = useDeleteGroup();

  const deptName = useMemo(() => {
    const m = new Map(departments.map((d) => [d.id, d.name]));
    return (id: string | null) => (id ? m.get(id) ?? "Unknown department" : "No department");
  }, [departments]);

  const fields: ManagerField[] = useMemo(
    () => [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "Group name" },
      {
        key: "departmentId",
        label: "Department",
        type: "picker",
        required: true,
        placeholder: "Select department",
        items: departments.map((d) => ({ label: d.name, value: d.id })),
      },
      {
        key: "leadUserId",
        label: "Team Lead",
        type: "picker",
        placeholder: "Select lead (optional)",
        items: users.map((u) => ({ label: u.displayName, value: u.id })),
      },
      { key: "description", label: "Description", type: "textarea", placeholder: "Optional" },
    ],
    [departments, users]
  );

  if (user && !canWrite) return <Redirect href="/(protected)/admin" />;

  const onErr = (e: unknown) =>
    Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");

  return (
    <OrgManagerScreen<GroupRow>
      title="Groups"
      rows={data}
      getName={(g) => g.name}
      getSubtitle={(g) => deptName(g.departmentId)}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isRefetching={isRefetching}
      fields={fields}
      toFormValues={(g) => ({
        name: g?.name ?? "",
        departmentId: g?.departmentId ?? "",
        leadUserId: g?.leadUserId ?? "",
        description: g?.description ?? "",
      })}
      isSaving={create.isPending || update.isPending}
      canWrite={canWrite}
      canDeleteMapped={canWrite}
      checkInUse={(g) => isGroupInUse(g.id)}
      onCreate={async (v, done) => {
        const names = v.name.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        try {
          for (const name of names) {
            await create.mutateAsync({
              name,
              departmentId: v.departmentId,
              leadUserId: v.leadUserId || null,
              description: v.description,
            });
          }
          done();
        } catch (e) {
          onErr(e);
        }
      }}
      onUpdate={(id, v, done) =>
        update.mutate(
          {
            id,
            patch: {
              name: v.name.trim(),
              departmentId: v.departmentId,
              leadUserId: v.leadUserId || null,
              description: v.description,
            },
          },
          { onSuccess: done, onError: onErr }
        )
      }
      onDelete={(g, done) => remove.mutate(g.id, { onSuccess: done, onError: onErr })}
    />
  );
}
