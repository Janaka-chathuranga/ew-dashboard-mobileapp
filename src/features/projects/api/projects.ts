import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  leadUserId: string | null;
  companyId: string | null;
  memberCount: number;
  issueCount: number;
}

export interface ProjectMember {
  userId: string;
  role: string;
  displayName: string;
  email: string;
}

/** All projects visible to the current user, with member/issue counts. */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, key, name, description, lead_user_id, company_id,
       members:project_members(count),
       issues:issues(count)`
    )
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description ?? null,
    leadUserId: p.lead_user_id ?? null,
    companyId: p.company_id ?? null,
    memberCount: p.members?.[0]?.count ?? 0,
    issueCount: p.issues?.[0]?.count ?? 0,
  }));
}

export async function fetchProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("user_id, role, profile:profiles ( display_name, email )")
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m: any) => ({
    userId: m.user_id,
    role: m.role,
    displayName: m.profile?.display_name ?? "Unknown",
    email: m.profile?.email ?? "",
  }));
}

export interface CreateProjectInput {
  key: string;
  name: string;
  description?: string | null;
  leadUserId?: string | null;
  companyId?: string | null;
}

/**
 * Create a project via the create_project RPC (atomic: project row + default
 * To Do / In Progress / Done statuses + lead/creator as project members).
 * RLS governs who may insert; the anon key is sufficient.
 */
export async function createProject(input: CreateProjectInput): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("create_project", {
    payload: {
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      lead_user_id: input.leadUserId ?? null,
      company_id: input.companyId ?? null,
    },
  });
  if (error) throw new Error(error.message);
  return { id: data as string };
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export interface UserProject {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

/** Projects a given user is a member of (for the user-wise project report). */
export async function fetchUserProjects(userId: string): Promise<UserProject[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("project:projects ( id, key, name, description )")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row: any) => row.project)
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description ?? null,
    }));
}

/** Add (or update the role of) a project member. RLS gates who may write. */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role = "member"
) {
  const { error } = await supabase
    .from("project_members")
    .upsert({ project_id: projectId, user_id: userId, role });
  if (error) throw new Error(error.message);
}

export async function removeProjectMember(projectId: string, userId: string) {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export function useProjects() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserProjects(userId: string | undefined) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["user-projects", userId],
    queryFn: () => fetchUserProjects(userId as string),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddProjectMember(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role?: string }) =>
      addProjectMember(projectId as string, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveProjectMember(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      removeProjectMember(projectId as string, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProject(projectId: string | undefined) {
  const { data } = useProjects();
  return data?.find((p) => p.id === projectId);
}

export function useProjectMembers(projectId: string | undefined) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId as string),
    enabled: isAuthenticated && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
