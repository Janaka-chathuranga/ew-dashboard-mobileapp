import { useSession } from "@/context/auth-context";
import {
  isDesignationInUse,
  OrgManagerScreen,
  useCreateDesignation,
  useDeleteDesignation,
  useDesignationsFull,
  useUpdateDesignation,
  type DesignationRow,
  type ManagerField,
} from "@/features/org";
import { Redirect } from "expo-router";
import { Alert } from "react-native";

const FIELDS: ManagerField[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "Designation / job title" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Optional" },
];

export default function DesignationsScreen() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const canWrite = isAdmin || !!user?.canCreateDesignations;

  const { data = [], isLoading, isError, error, refetch, isRefetching } = useDesignationsFull();
  const create = useCreateDesignation();
  const update = useUpdateDesignation();
  const remove = useDeleteDesignation();

  if (user && !canWrite) return <Redirect href="/(protected)/admin" />;

  const onErr = (e: unknown) =>
    Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");

  return (
    <OrgManagerScreen<DesignationRow>
      title="Designations"
      rows={data}
      getName={(d) => d.name}
      getSubtitle={(d) => d.description ?? undefined}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isRefetching={isRefetching}
      fields={FIELDS}
      toFormValues={(d) => ({ name: d?.name ?? "", description: d?.description ?? "" })}
      isSaving={create.isPending || update.isPending}
      canWrite={canWrite}
      canDeleteMapped={canWrite}
      checkInUse={(d) => isDesignationInUse(d.id)}
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
      onDelete={(d, done) => remove.mutate(d.id, { onSuccess: done, onError: onErr })}
    />
  );
}
