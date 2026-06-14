import { useSession } from "@/context/auth-context";
import {
  isDepartmentInUse,
  OrgManagerScreen,
  useCompaniesFull,
  useCreateDepartment,
  useDeleteDepartment,
  useDepartmentsFull,
  useUpdateDepartment,
  type DepartmentRow,
  type ManagerField,
} from "@/features/org";
import { Redirect } from "expo-router";
import { useMemo } from "react";
import { Alert } from "react-native";

export default function DepartmentsScreen() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const canWrite = isAdmin || !!user?.canCreateDepartments;

  const { data: companies = [] } = useCompaniesFull();
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useDepartmentsFull();
  const create = useCreateDepartment();
  const update = useUpdateDepartment();
  const remove = useDeleteDepartment();

  const companyName = useMemo(() => {
    const m = new Map(companies.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? m.get(id) ?? "Unknown company" : "No company");
  }, [companies]);

  const fields: ManagerField[] = useMemo(
    () => [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "Department name" },
      {
        key: "companyId",
        label: "Company",
        type: "picker",
        required: true,
        placeholder: "Select company",
        items: companies.map((c) => ({ label: c.name, value: c.id })),
      },
      { key: "description", label: "Description", type: "textarea", placeholder: "Optional" },
    ],
    [companies]
  );

  if (user && !canWrite) return <Redirect href="/(protected)/admin" />;

  const onErr = (e: unknown) =>
    Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");

  return (
    <OrgManagerScreen<DepartmentRow>
      title="Departments"
      rows={data}
      getName={(d) => d.name}
      getSubtitle={(d) => companyName(d.companyId)}
      isLoading={isLoading}
      isError={isError}
      error={error}
      refetch={refetch}
      isRefetching={isRefetching}
      fields={fields}
      toFormValues={(d) => ({
        name: d?.name ?? "",
        companyId: d?.companyId ?? "",
        description: d?.description ?? "",
      })}
      isSaving={create.isPending || update.isPending}
      canWrite={canWrite}
      canDeleteMapped={canWrite}
      checkInUse={(d) => isDepartmentInUse(d.id)}
      onCreate={async (v, done) => {
        const names = v.name.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        try {
          for (const name of names) {
            await create.mutateAsync({
              name,
              companyId: v.companyId,
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
          { id, patch: { name: v.name.trim(), companyId: v.companyId, description: v.description } },
          { onSuccess: done, onError: onErr }
        )
      }
      onDelete={(d, done) => remove.mutate(d.id, { onSuccess: done, onError: onErr })}
    />
  );
}
