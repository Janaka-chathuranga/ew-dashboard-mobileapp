import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface AdminUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  roleId: string;
  companyId: string | null;
  departmentId: string | null;
  groupId: string | null;
  designationId: string | null;
  canManageTasks: boolean;
  canDeleteTasks: boolean;
  canFilterDashboard: boolean;
  canAccessConsole: boolean;
  canCreateUsers: boolean;
  canCreateCompanies: boolean;
  canCreateDepartments: boolean;
  canCreateGroups: boolean;
  canCreateDesignations: boolean;
  canCreateRoles: boolean;
  canCreateProjects: boolean;
}

/** Reading the user directory is allowed by RLS — no Edge Function needed. */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, email, active, role, company_id, department_id, group_id, designation_id, can_manage_tasks, can_delete_tasks, can_filter_dashboard, can_access_console, can_create_users, can_create_companies, can_create_departments, can_create_groups, can_create_designations, can_create_roles, can_create_projects"
    )
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: any) => ({
    accountId: p.id,
    displayName: p.display_name,
    emailAddress: p.email,
    active: p.active,
    roleId: p.role,
    companyId: p.company_id,
    departmentId: p.department_id,
    groupId: p.group_id,
    designationId: p.designation_id ?? null,
    canManageTasks: p.can_manage_tasks ?? false,
    canDeleteTasks: p.can_delete_tasks ?? false,
    canFilterDashboard: p.can_filter_dashboard ?? false,
    canAccessConsole: p.can_access_console ?? false,
    canCreateUsers: p.can_create_users ?? false,
    canCreateCompanies: p.can_create_companies ?? false,
    canCreateDepartments: p.can_create_departments ?? false,
    canCreateGroups: p.can_create_groups ?? false,
    canCreateDesignations: p.can_create_designations ?? false,
    canCreateRoles: p.can_create_roles ?? false,
    canCreateProjects: p.can_create_projects ?? false,
  }));
}

export interface CreateUserPayload {
  displayName: string;
  emailAddress: string;
  password: string;
  roleId: string;
  companyId?: string | null;
  departmentId?: string | null;
  groupId?: string | null;
  designationId?: string | null;
  canManageTasks?: boolean;
  canDeleteTasks?: boolean;
  canFilterDashboard?: boolean;
  canAccessConsole?: boolean;
  canCreateUsers?: boolean;
  canCreateCompanies?: boolean;
  canCreateDepartments?: boolean;
  canCreateGroups?: boolean;
  canCreateDesignations?: boolean;
  canCreateRoles?: boolean;
  canCreateProjects?: boolean;
}

export type UpdateUserPayload = Partial<
  Omit<CreateUserPayload, "password"> & { active: boolean }
>;

/**
 * Invoke the privileged `admin-users` Edge Function. The caller's session JWT is
 * attached automatically; the function re-checks role server-side. The
 * service-role key lives only in the function — never in this app.
 */
async function invokeAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body,
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as any).context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch {
      // keep the original message
    }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useAdminUsers() {
  const { user, isAuthenticated } = useSession();
  // Surface the directory to console-capable users and to department heads /
  // leads (who need it for the Team screen). Profiles are RLS-readable by any
  // authenticated user, so this fetch is safe; per-screen gates still apply.
  const allowed =
    !!user?.canAccessConsole ||
    user?.role === "admin" ||
    user?.role === "head" ||
    user?.role === "department-lead";
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
    enabled: isAuthenticated && allowed,
    staleTime: 60 * 1000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      invokeAdmin({ action: "create", payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: UpdateUserPayload;
    }) => invokeAdmin({ action: "update", accountId, payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) =>
      invokeAdmin({ action: "delete", accountId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
