import { useSession } from "@/context/auth-context";
import {
  isRoleInUse,
  OrgManagerScreen,
  useCreateRole,
  useDeleteRole,
  useRolesFull,
  useUpdateRole,
  type ManagerField,
  type RoleRow,
} from "@/features/org";
import { Redirect } from "expo-router";
import { Alert } from "react-native";

const FIELDS: ManagerField[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "Role name (e.g. Lead)" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Optional" },
];

export default function RolesScreen() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const canWrite = isAdmin || !!user?.canCreateRoles;

  const { data = [], isLoading, isError, error, refetch, isRefetching } = useRolesFull();
  const create = useCreateRole();
  const update = useUpdateRole();
  const remove = useDeleteRole();

  if (user && !canWrite) return <Redirect href="/(protected)/admin" />;

  const onErr = (e: unknown) =>
    Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");

  return (
    <OrgManagerScreen<RoleRow>
      title="Roles"
      rows={data}
      getName={(r) => r.name}
      getSubtitle={(r) => r.description ?? undefined}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isRefetching={isRefetching}
      fields={FIELDS}
      toFormValues={(r) => ({ name: r?.name ?? "", description: r?.description ?? "" })}
      isSaving={create.isPending || update.isPending}
      canWrite={canWrite}
      canDeleteMapped={canWrite}
      checkInUse={(r) => isRoleInUse(r.name)}
      onCreate={async (v, done) => {
        const names = v.name.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        try {
          for (const name of names) {
            await create.mutateAsync({ name, description: v.description });
          }
          done();
        } catch (e) {
          onErr(e);
        }
      }}
      onUpdate={(id, v, done) =>
        update.mutate(
          { id, patch: { name: v.name.trim(), description: v.description } },
          { onSuccess: done, onError: onErr }
        )
      }
      onDelete={(r, done) => remove.mutate(r.id, { onSuccess: done, onError: onErr })}
    />
  );
}
