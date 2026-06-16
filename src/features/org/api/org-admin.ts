import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Org-entity management (companies, departments, groups, designations) and
// department-head assignment.
//
// All writes go DIRECTLY from the client under the publishable key — RLS is the
// security boundary (Hard Rule #3): companies/departments/designations and
// department_heads are gated by is_admin(); groups also allow can_create_groups
// heads scoped to their own department (groups_head_write). A non-admin's write
// is rejected by Postgres, not by this code. No service-role key is involved.
// ---------------------------------------------------------------------------

export interface CompanyRow {
  id: string;
  name: string;
  description: string | null;
}
export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  companyId: string | null;
}
export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  leadUserId: string | null;
}
export interface DesignationRow {
  id: string;
  name: string;
  description: string | null;
}
export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  /** Where the role applies: 'user' | 'project' | 'both'. */
  scope: string;
  /** For user-facing roles, the user_role enum value to store on profiles.role. */
  roleValue: string | null;
}

/** A role option for the Create/Edit User dropdown (value = user_role enum). */
export interface UserRoleChoice {
  value: string;
  label: string;
}

/**
 * A role option for the Create/Edit User picker, keyed by the master role id so
 * custom-named user roles are selectable. `id` is stored on profiles.role_id;
 * `roleValue` is the permission level (user_role enum) or null (defaults to
 * 'member' server-side).
 */
export interface UserRoleOption {
  id: string; // project_roles.id — stored on profiles.role_id
  name: string;
  roleValue: string | null;
}

/** Invalidate every org-related cache (picker lists + full management lists). */
function invalidateOrg(qc: ReturnType<typeof useQueryClient>) {
  for (const k of [
    "companies",
    "companies-full",
    "departments",
    "departments-full",
    "groups",
    "groups-full",
    "designations",
    "designations-full",
    "roles",
    "roles-full",
    "user-role-choices",
    "user-role-options",
  ]) {
    qc.invalidateQueries({ queryKey: [k] });
  }
}

// --------------------------------- Companies -------------------------------
export async function fetchCompaniesFull(): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, description")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
  }));
}
export async function createCompany(input: { name: string; description?: string | null }) {
  const { error } = await supabase
    .from("companies")
    .insert({ name: input.name, description: input.description || null });
  if (error) throw new Error(error.message);
}
export async function updateCompany(
  id: string,
  patch: { name: string; description?: string | null }
) {
  const { error } = await supabase
    .from("companies")
    .update({ name: patch.name, description: patch.description || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// -------------------------------- Departments ------------------------------
export async function fetchDepartmentsFull(companyId?: string): Promise<DepartmentRow[]> {
  let q = supabase
    .from("departments")
    .select("id, name, description, company_id")
    .order("name");
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    companyId: d.company_id ?? null,
  }));
}
export async function createDepartment(input: {
  name: string;
  companyId: string;
  description?: string | null;
}) {
  const { error } = await supabase.from("departments").insert({
    name: input.name,
    company_id: input.companyId,
    description: input.description || null,
  });
  if (error) throw new Error(error.message);
}
export async function updateDepartment(
  id: string,
  patch: { name: string; companyId: string; description?: string | null }
) {
  const { error } = await supabase
    .from("departments")
    .update({
      name: patch.name,
      company_id: patch.companyId,
      description: patch.description || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteDepartment(id: string) {
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ----------------------------------- Groups --------------------------------
export async function fetchGroupsFull(departmentId?: string): Promise<GroupRow[]> {
  let q = supabase
    .from("groups")
    .select("id, name, description, department_id, lead_user_id")
    .order("name");
  if (departmentId) q = q.eq("department_id", departmentId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description ?? null,
    departmentId: g.department_id ?? null,
    leadUserId: g.lead_user_id ?? null,
  }));
}
export async function createGroup(input: {
  name: string;
  departmentId: string;
  description?: string | null;
  leadUserId?: string | null;
}) {
  const { error } = await supabase.from("groups").insert({
    name: input.name,
    department_id: input.departmentId,
    description: input.description || null,
    lead_user_id: input.leadUserId || null,
  });
  if (error) throw new Error(error.message);
}
export async function updateGroup(
  id: string,
  patch: {
    name: string;
    departmentId: string;
    description?: string | null;
    leadUserId?: string | null;
  }
) {
  const { error } = await supabase
    .from("groups")
    .update({
      name: patch.name,
      department_id: patch.departmentId,
      description: patch.description || null,
      lead_user_id: patch.leadUserId || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteGroup(id: string) {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// -------------------------------- Designations -----------------------------
export async function fetchDesignationsFull(): Promise<DesignationRow[]> {
  const { data, error } = await supabase
    .from("designations")
    .select("id, name, description")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? null,
  }));
}
export async function createDesignation(input: {
  name: string;
  description?: string | null;
}) {
  const { error } = await supabase
    .from("designations")
    .insert({ name: input.name, description: input.description || null });
  if (error) throw new Error(error.message);
}
export async function updateDesignation(
  id: string,
  patch: { name: string; description?: string | null }
) {
  const { error } = await supabase
    .from("designations")
    .update({ name: patch.name, description: patch.description || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteDesignation(id: string) {
  const { error } = await supabase.from("designations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ------------------------------- Project Roles -----------------------------
// A master of the roles assignable to project members. project_members.role is
// free text, so this list governs the choices the UI offers (value = name).
export async function fetchRolesFull(): Promise<RoleRow[]> {
  const { data, error } = await supabase
    .from("project_roles")
    .select("id, name, description, scope, role_value")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    scope: r.scope ?? "project",
    roleValue: r.role_value ?? null,
  }));
}

// Precedence so the Create-User dropdown reads naturally regardless of name.
const USER_ROLE_ORDER: Record<string, number> = {
  member: 1,
  "team-lead": 2,
  "department-lead": 3,
  head: 4,
  admin: 5,
};

/**
 * Roles offered when creating/editing a USER, sourced from the same project_roles
 * master (scope user|both). `value` is the user_role enum value so profiles.role
 * stays valid; `label` is the (editable) display name from the master.
 */
export async function fetchUserRoleChoices(): Promise<UserRoleChoice[]> {
  const { data, error } = await supabase
    .from("project_roles")
    .select("name, scope, role_value")
    .in("scope", ["user", "both"])
    .not("role_value", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r: any) => ({ value: r.role_value as string, label: r.name as string }))
    .sort((a, b) => (USER_ROLE_ORDER[a.value] ?? 99) - (USER_ROLE_ORDER[b.value] ?? 99));
}
/**
 * ALL roles assignable to a USER (scope user|both), keyed by the master role id
 * so custom-named user roles are selectable too. The Create/Edit-User form
 * stores the id on profiles.role_id and derives the permission level from
 * roleValue (defaults to 'member' server-side when null). Ported from the web
 * lib/admin-api.ts fetchUserRoleOptions().
 */
export async function fetchUserRoleOptions(): Promise<UserRoleOption[]> {
  const { data, error } = await supabase
    .from("project_roles")
    .select("id, name, role_value, scope")
    .in("scope", ["user", "both"])
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id as string,
    name: r.name as string,
    roleValue: (r.role_value as string) ?? null,
  }));
}

// A user's permission level is stored in the fixed `user_role` enum, so a
// user-scope role only becomes assignable when its name resolves to one of these
// values. Resolved leniently from the typed name (covers the seeded system-role
// names + aliases). Project-scope roles are free text and don't need this.
// Ported verbatim from the web lib/admin-api.ts systemRoleValueFor().
export function systemRoleValueFor(name: string): string | null {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  const map: Record<string, string> = {
    member: "member",
    "team lead": "team-lead",
    "team-lead": "team-lead",
    teamlead: "team-lead",
    "department lead": "department-lead",
    "department-lead": "department-lead",
    "dept lead": "department-lead",
    "department head": "department-lead",
    "dept head": "department-lead",
    head: "head",
    admin: "admin",
    administrator: "admin",
  };
  return map[n] ?? null;
}

export async function createRole(input: {
  name: string;
  description?: string | null;
  scope: string; // 'user' | 'project'
}) {
  const scope = input.scope;
  const { error } = await supabase.from("project_roles").insert({
    name: input.name,
    description: input.description || null,
    scope,
    // User roles resolve to the matching system enum; project roles have none.
    role_value: scope === "user" ? systemRoleValueFor(input.name) : null,
  });
  if (error) throw new Error(error.message);
}
export async function updateRole(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    scope?: string;
    roleValue?: string | null;
  }
) {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined)
    update.description = patch.description || null;
  if (patch.scope !== undefined) {
    update.scope = patch.scope;
    // Keep role_value consistent with scope: clear it for project-only roles.
    if (patch.scope !== "user") update.role_value = null;
  }
  if (patch.roleValue !== undefined && patch.scope !== "project") {
    update.role_value = patch.roleValue;
  }
  const { error } = await supabase
    .from("project_roles")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteRole(id: string) {
  const { error } = await supabase.from("project_roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ------------------------------ department_heads ----------------------------
/** Department IDs a user heads (multi-department support). */
export async function fetchUserHeadDepartments(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("department_heads")
    .select("department_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.department_id);
}

/** Replace a user's department-head assignments. Admin-only via RLS. */
export async function setUserHeadDepartments(userId: string, departmentIds: string[]) {
  const { error: delErr } = await supabase
    .from("department_heads")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);
  if (departmentIds.length) {
    const rows = departmentIds.map((department_id) => ({ department_id, user_id: userId }));
    const { error } = await supabase.from("department_heads").insert(rows);
    if (error) throw new Error(error.message);
  }
}

// ------------------------- "in use" (mapped) checks ------------------------
// An entity is "mapped" if other records reference it. Mapped masters must not
// be casually deleted; the UI blocks it unless the actor is an admin / permitted
// head (who then gets a cascade warning).
async function countRef(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) return 0;
  return count ?? 0;
}

async function anyRef(
  checks: { table: string; column: string }[],
  value: string
): Promise<boolean> {
  for (const c of checks) {
    if ((await countRef(c.table, c.column, value)) > 0) return true;
  }
  return false;
}

export const isCompanyInUse = (id: string) =>
  anyRef(
    [
      { table: "departments", column: "company_id" },
      { table: "profiles", column: "company_id" },
      { table: "projects", column: "company_id" },
    ],
    id
  );

export const isDepartmentInUse = (id: string) =>
  anyRef(
    [
      { table: "groups", column: "department_id" },
      { table: "profiles", column: "department_id" },
      { table: "department_heads", column: "department_id" },
    ],
    id
  );

export const isGroupInUse = (id: string) =>
  anyRef(
    [
      { table: "group_members", column: "group_id" },
      { table: "profiles", column: "group_id" },
      { table: "issues", column: "group_id" },
    ],
    id
  );

export const isDesignationInUse = (id: string) =>
  anyRef([{ table: "profiles", column: "designation_id" }], id);

// project_members.role stores the role NAME (free text), so the in-use check
// counts members carrying this role name rather than a foreign-key id.
export const isRoleInUse = (name: string) =>
  countRef("project_members", "role", name).then((n) => n > 0);

// --------------------------------- Hooks -----------------------------------
export function useCompaniesFull() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["companies-full"],
    queryFn: fetchCompaniesFull,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
export function useDepartmentsFull(companyId?: string) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["departments-full", companyId ?? "all"],
    queryFn: () => fetchDepartmentsFull(companyId),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
export function useGroupsFull(departmentId?: string) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["groups-full", departmentId ?? "all"],
    queryFn: () => fetchGroupsFull(departmentId),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
export function useDesignationsFull() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["designations-full"],
    queryFn: fetchDesignationsFull,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
export function useRolesFull() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["roles-full"],
    queryFn: fetchRolesFull,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
export function useUserRoleChoices() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["user-role-choices"],
    queryFn: fetchUserRoleChoices,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
/** All user-assignable roles keyed by master id (Create/Edit-User picker). */
export function useUserRoleOptions() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["user-role-options"],
    queryFn: fetchUserRoleOptions,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserHeadDepartments(userId?: string) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["head-departments", userId],
    queryFn: () => fetchUserHeadDepartments(userId as string),
    enabled: isAuthenticated && !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Departments the current user oversees: ones they head (department_heads) plus
 * their own profile department. Used to UI-scope the Team directory for heads
 * (profiles are readable by everyone via RLS — this scope is a product decision,
 * not the security boundary; task visibility itself is enforced by RLS).
 */
export function useMyScopeDepartments() {
  const { user, isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["my-scope-departments", user?.id],
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const heads = await fetchUserHeadDepartments(user!.id);
      const ids = new Set(heads);
      if (user!.departmentId) ids.add(user!.departmentId);
      return Array.from(ids);
    },
  });
}

// Generic mutation factory — keeps the 12 CRUD hooks consistent and terse.
function useOrgMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidateOrg(qc),
  });
}

export const useCreateCompany = () => useOrgMutation(createCompany);
export const useUpdateCompany = () =>
  useOrgMutation(({ id, patch }: { id: string; patch: { name: string; description?: string | null } }) =>
    updateCompany(id, patch)
  );
export const useDeleteCompany = () => useOrgMutation(deleteCompany);

export const useCreateDepartment = () => useOrgMutation(createDepartment);
export const useUpdateDepartment = () =>
  useOrgMutation(
    ({ id, patch }: { id: string; patch: { name: string; companyId: string; description?: string | null } }) =>
      updateDepartment(id, patch)
  );
export const useDeleteDepartment = () => useOrgMutation(deleteDepartment);

export const useCreateGroup = () => useOrgMutation(createGroup);
export const useUpdateGroup = () =>
  useOrgMutation(
    ({
      id,
      patch,
    }: {
      id: string;
      patch: { name: string; departmentId: string; description?: string | null; leadUserId?: string | null };
    }) => updateGroup(id, patch)
  );
export const useDeleteGroup = () => useOrgMutation(deleteGroup);

export const useCreateDesignation = () => useOrgMutation(createDesignation);
export const useUpdateDesignation = () =>
  useOrgMutation(({ id, patch }: { id: string; patch: { name: string; description?: string | null } }) =>
    updateDesignation(id, patch)
  );
export const useDeleteDesignation = () => useOrgMutation(deleteDesignation);

export const useCreateRole = () => useOrgMutation(createRole);
export const useUpdateRole = () =>
  useOrgMutation(
    ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        name?: string;
        description?: string | null;
        scope?: string;
        roleValue?: string | null;
      };
    }) => updateRole(id, patch)
  );
export const useDeleteRole = () => useOrgMutation(deleteRole);
