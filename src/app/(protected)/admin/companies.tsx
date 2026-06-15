import { useSession } from "@/context/auth-context";
import {
  isCompanyInUse,
  OrgManagerScreen,
  useCompaniesFull,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
  type CompanyRow,
  type ManagerField,
} from "@/features/org";
import { Redirect } from "expo-router";
import { Alert } from "react-native";

const FIELDS: ManagerField[] = [
  { key: "name", label: "Name", type: "text", required: true, placeholder: "Company name" },
  { key: "description", label: "Description", type: "textarea", placeholder: "Optional" },
];

export default function CompaniesScreen() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const canWrite = isAdmin || !!user?.canCreateCompanies;

  const { data = [], isLoading, isError, error, refetch, isRefetching } = useCompaniesFull();
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const remove = useDeleteCompany();

  if (user && !canWrite) return <Redirect href="/(protected)/admin" />;

  const onErr = (e: unknown) =>
    Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");

  return (
    <OrgManagerScreen<CompanyRow>
      title="Companies"
      rows={data}
      getName={(c) => c.name}
      getSubtitle={(c) => c.description ?? undefined}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isRefetching={isRefetching}
      fields={FIELDS}
      toFormValues={(c) => ({ name: c?.name ?? "", description: c?.description ?? "" })}
      isSaving={create.isPending || update.isPending}
      canWrite={canWrite}
      canDeleteMapped={canWrite}
      checkInUse={(c) => isCompanyInUse(c.id)}
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
      onDelete={(c, done) => remove.mutate(c.id, { onSuccess: done, onError: onErr })}
    />
  );
}
