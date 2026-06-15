import { supabase } from "@/lib/supabase";

/**
 * The signed-in user's profile row, mirroring the web app's
 * `fetchCurrentUser` + `fetchMyProfile` (lib/admin-api.ts). Holds role, org
 * assignment and the permission flags screens gate on. RLS scopes the row to
 * the caller, so we fetch by `auth.uid()` and never hand-filter.
 */
export interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
  avatarUrl: string | null;
  companyId: string | null;
  departmentId: string | null;
  groupId: string | null;
  designationId: string | null;
  companyName: string | null;
  departmentName: string | null;
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

// Explicit FK hints: department_heads creates a second profiles↔departments
// relationship, so an unqualified `departments` embed is ambiguous and errors
// (same gotcha the web app's fetchCurrentUser documents).
const PROFILE_SELECT = `
  id, display_name, email, role, active, avatar_url,
  company_id, department_id, group_id, designation_id,
  can_manage_tasks, can_delete_tasks, can_filter_dashboard,
  can_access_console, can_create_users, can_create_companies, can_create_departments,
  can_create_groups, can_create_designations, can_create_roles, can_create_projects,
  company:companies!profiles_company_id_fkey ( name ),
  department:departments!profiles_department_id_fkey ( name )
`;

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const p = data as any;
  return {
    id: p.id,
    displayName: p.display_name,
    email: p.email,
    role: p.role,
    active: p.active ?? true,
    avatarUrl: p.avatar_url ?? null,
    companyId: p.company_id ?? null,
    departmentId: p.department_id ?? null,
    groupId: p.group_id ?? null,
    designationId: p.designation_id ?? null,
    companyName: p.company?.name ?? null,
    departmentName: p.department?.name ?? null,
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
  };
}
