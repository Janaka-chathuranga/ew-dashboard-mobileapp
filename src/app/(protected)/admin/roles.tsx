import { useSession } from "@/context/auth-context";
import {
  isRoleInUse,
  OrgManagerScreen,
  systemRoleValueFor,
  useCreateRole,
  useDeleteRole,
  useRolesFull,
  useUpdateRole,
  type ManagerField,
  type RoleRow,
} from "@/features/org";
import { Redirect } from "expo-router";
import { Alert } from "react-native";

// Scope decides where a role appears: a "user" role is offered when creating a
// user; a "project" role is offered when adding project members. No default —
// the user must choose (required). (A seeded "both"-scoped role like Member is
// shown as "user" here and preserved on save; see onUpdate below.)
const FIELDS: ManagerField[] = [
  {
    key: "scope",
    label: "Scope",
    type: "picker",
    required: true,
    placeholder: "Select scope",
    items: [
      { label: "User role (shown when creating a user)", value: "user" },
      { label: "Project role (shown when adding project members)", value: "project" },
    ],
  },
  { key: "name", label: "Name", type: "text", required: true, placeholder: "Role name (e.g. Lead)" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Optional" },
];

const scopeLabel = (scope: string) =>
  scope === "both" ? "User & Project" : scope === "user" ? "User" : "Project";

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
      getSubtitle={(r) =>
        [scopeLabel(r.scope), r.description].filter(Boolean).join(" · ") || undefined
      }
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isRefetching={isRefetching}
      fields={FIELDS}
      toFormValues={(r) => ({
        name: r?.name ?? "",
        description: r?.description ?? "",
        // Show a user/both role as "user"; an unset (create) row forces a choice.
        scope: r ? (r.scope === "user" || r.scope === "both" ? "user" : "project") : "",
      })}
      isSaving={create.isPending || update.isPending}
      canWrite={canWrite}
      canDeleteMapped={canWrite}
      checkInUse={(r) => isRoleInUse(r.name)}
      onCreate={async (v, done) => {
        const names = v.name.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        try {
          for (const name of names) {
            await create.mutateAsync({ name, description: v.description, scope: v.scope });
          }
          done();
        } catch (e) {
          onErr(e);
        }
      }}
      onUpdate={(id, v, done) => {
        const name = v.name.trim();
        const existing = data.find((r) => r.id === id);
        // Preserve a "both"-scoped role (e.g. Member) rather than narrowing it.
        const persistScope =
          v.scope === "user" && existing?.scope === "both" ? "both" : v.scope;
        update.mutate(
          {
            id,
            patch: {
              name,
              description: v.description,
              scope: persistScope,
              // User roles resolve to a system enum; project roles have none.
              roleValue: v.scope === "user" ? systemRoleValueFor(name) : null,
            },
          },
          { onSuccess: done, onError: onErr }
        );
      }}
      onDelete={(r, done) => remove.mutate(r.id, { onSuccess: done, onError: onErr })}
    />
  );
}
