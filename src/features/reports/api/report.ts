import { useSession } from "@/context/auth-context";
import type { CurrentUser } from "@/features/auth";
import { fetchUserTasks } from "@/features/issues";
import { fetchUserHeadDepartments } from "@/features/org";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface RangeStats {
  assignedCount: number;
  completedCount: number;
  estimatedSeconds: number;
  spentSeconds: number;
}

export interface ReportRow extends RangeStats {
  userId: string;
  displayName: string;
}

/** A person the current viewer is allowed to see in reports. */
export interface ReportPerson {
  userId: string;
  displayName: string;
  email: string;
}

const ts = (d: string) => new Date(d).getTime();

/** Count assigned/completed + sum estimate/spent within [start,end]. Ported
 * verbatim from the web reports page (getTasksCountForRange). */
export function getTasksCountForRange(
  tasks: any[],
  start: string,
  end: string
): RangeStats {
  const startTs = ts(start + "T00:00:00Z");
  const endTs = ts(end + "T23:59:59Z");

  let assignedCount = 0;
  let completedCount = 0;
  let estimatedSeconds = 0;
  let spentSeconds = 0;

  for (const task of tasks) {
    const fields = task.fields || {};
    const taskStartStr = fields.customfield_10015 || fields.created;
    if (taskStartStr) {
      const t = ts(taskStartStr);
      if (t >= startTs && t <= endTs) assignedCount++;
    }

    const statusName = fields.status?.name?.toLowerCase() || "";
    const statusCategory = fields.status?.statusCategory?.name || "";
    const isDone =
      statusCategory === "Done" ||
      statusName.includes("done") ||
      statusName.includes("closed") ||
      statusName.includes("resolved");

    if (isDone) {
      const completedStr = fields.resolutiondate || fields.updated;
      if (completedStr) {
        const t = ts(completedStr);
        if (t >= startTs && t <= endTs) completedCount++;
      }
    }

    estimatedSeconds += fields.timetracking?.originalEstimateSeconds || 0;
    spentSeconds += fields.timetracking?.timeSpentSeconds || 0;
  }

  return { assignedCount, completedCount, estimatedSeconds, spentSeconds };
}

/**
 * The set of people the current viewer may report on. This is a product-level
 * UI scope (task visibility itself is still enforced by RLS):
 *  - admin               → everyone
 *  - department head     → users in the departments they head (+ their own dept)
 *  - group leader        → users assigned to groups they lead
 *  - project leader      → members of projects they lead
 *  - everyone else       → only themselves
 * The buckets are unioned, so a user who is e.g. both a group and project lead
 * sees the combined set.
 */
export async function fetchReportScope(me: CurrentUser): Promise<ReportPerson[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, department_id, group_id")
    .eq("active", true)
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  const all = profiles ?? [];

  const toPerson = (p: any): ReportPerson => ({
    userId: p.id,
    displayName: p.display_name,
    email: p.email,
  });

  if (me.role === "admin") return all.map(toPerson);

  const allowed = new Set<string>([me.id]); // always your own report

  // Departments this user heads (multi-dept) + their own dept if head/lead.
  const headDepts = await fetchUserHeadDepartments(me.id);
  const deptScope = new Set<string>(headDepts);
  if ((me.role === "head" || me.role === "department-lead") && me.departmentId) {
    deptScope.add(me.departmentId);
  }

  // Groups this user leads → members assigned to those groups.
  const { data: ledGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("lead_user_id", me.id);
  const ledGroupIds = new Set((ledGroups ?? []).map((g: any) => g.id));

  // Projects this user leads → their members.
  const { data: ledProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("lead_user_id", me.id);
  const ledProjectIds = (ledProjects ?? []).map((p: any) => p.id);
  const projectMemberIds = new Set<string>();
  if (ledProjectIds.length) {
    const { data: members } = await supabase
      .from("project_members")
      .select("user_id")
      .in("project_id", ledProjectIds);
    for (const m of members ?? []) projectMemberIds.add((m as any).user_id);
  }

  for (const p of all) {
    if (p.department_id && deptScope.has(p.department_id)) allowed.add(p.id);
    if (p.group_id && ledGroupIds.has(p.group_id)) allowed.add(p.id);
    if (projectMemberIds.has(p.id)) allowed.add(p.id);
  }

  return all.filter((p) => allowed.has(p.id)).map(toPerson);
}

/** People the signed-in user may report on (see fetchReportScope). */
export function useReportScope() {
  const { user, isAuthenticated } = useSession();
  return useQuery({
    queryKey: ["report-scope", user?.id],
    queryFn: () => fetchReportScope(user as CurrentUser),
    enabled: isAuthenticated && !!user,
    staleTime: 60 * 1000,
  });
}

/** Build the per-user report for a date range over an explicit set of people. */
export async function fetchRangeReport(
  start: string,
  end: string,
  people: ReportPerson[]
): Promise<ReportRow[]> {
  const rows = await Promise.all(
    people.map(async (u) => {
      try {
        const tasks = await fetchUserTasks(u.userId, start, end);
        return {
          userId: u.userId,
          displayName: u.displayName,
          ...getTasksCountForRange(tasks, start, end),
        };
      } catch {
        return {
          userId: u.userId,
          displayName: u.displayName,
          assignedCount: 0,
          completedCount: 0,
          estimatedSeconds: 0,
          spentSeconds: 0,
        };
      }
    })
  );
  return rows;
}

export function useRangeReport(
  start: string,
  end: string,
  people: ReportPerson[],
  enabled: boolean
) {
  const ids = people.map((p) => p.userId).join(",");
  return useQuery({
    queryKey: ["report", start, end, ids],
    queryFn: () => fetchRangeReport(start, end, people),
    enabled: enabled && !!start && !!end && people.length > 0,
    staleTime: 60 * 1000,
  });
}
