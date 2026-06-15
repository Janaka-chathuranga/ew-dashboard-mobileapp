import { formatDuration, parseDuration } from "@/lib/duration";
import { supabase } from "@/lib/supabase";
import type {
  AdminTaskInput,
  EditableIssue,
  JiraIssue,
  ProjectStatus,
} from "../types";

// Columns + relations needed to build a JiraIssue, fetched in one round-trip.
// Mirrors the web ISSUE_SELECT exactly (incl. the explicit FK hints).
const ISSUE_SELECT = `
  id, key, title, description, priority, type,
  created_at, updated_at, due_date, start_date,
  estimate_minutes, spent_minutes, company_id, department_id, group_id,
  status:workflow_statuses!issues_status_id_fkey ( key, label, category ),
  project:projects!issues_project_id_fkey ( id, key, name, description ),
  assignees:issue_assignees (
    profile:profiles!issue_assignees_user_id_fkey ( id, display_name, email, active ),
    assigner:profiles!issue_assignees_assigned_by_fkey ( id, display_name )
  )
`;

interface StatusRel {
  key: string;
  label: string;
  category: string;
}

function statusVisual(status: StatusRel | null) {
  const category = status?.category ?? "todo";
  const colorName =
    category === "done"
      ? "green"
      : category === "in_progress"
        ? "yellow"
        : "blue";
  const id = category === "done" ? "3" : category === "in_progress" ? "2" : "1";
  // Canonical Jira status-category name the dashboard categorizer matches on.
  const categoryName =
    category === "done"
      ? "Done"
      : category === "in_progress"
        ? "In Progress"
        : "To Do";
  return { name: status?.label ?? "To Do", id, colorName, categoryName };
}

function priorityId(priority: string) {
  return priority === "high" ? "1" : priority === "medium" ? "2" : "3";
}

/** Map a Supabase issue row (with relations) into the JiraIssue shape. */
export function mapIssueToJira(row: any): JiraIssue {
  const status = (row.status ?? null) as StatusRel | null;
  const visual = statusVisual(status);
  const firstAssignee = row.assignees?.[0]?.profile ?? null;
  const assigner = row.assignees?.[0]?.assigner ?? null;
  const isDone = status?.category === "done";

  return {
    id: row.id,
    key: row.key,
    self: "",
    companyId: row.company_id ?? null,
    departmentId: row.department_id ?? null,
    groupId: row.group_id ?? null,
    assignedBy: assigner
      ? { accountId: assigner.id, displayName: assigner.display_name }
      : null,
    fields: {
      summary: row.title,
      description: row.description || "",
      status: {
        name: visual.name,
        id: visual.id,
        statusCategory: {
          name: visual.categoryName,
          colorName: visual.colorName,
        },
      },
      priority: { name: row.priority, id: priorityId(row.priority) },
      issuetype: { name: row.type || "Task", id: "10001" },
      assignee: firstAssignee
        ? {
            accountId: firstAssignee.id,
            displayName: firstAssignee.display_name,
            emailAddress: firstAssignee.email,
            active: firstAssignee.active,
          }
        : null,
      created: row.created_at,
      updated: row.updated_at,
      project: row.project,
      resolutiondate: isDone ? row.updated_at : null,
      duedate: row.due_date,
      // Sprints aren't modelled yet; treat every issue as belonging to an active
      // sprint so the dashboard's sprint-gated buckets populate (web parity).
      customfield_10020: [{ id: 1, name: "Active Sprint", state: "active" }],
      customfield_10015: row.start_date,
      timetracking: {
        originalEstimate:
          row.estimate_minutes != null
            ? formatDuration(row.estimate_minutes)
            : null,
        originalEstimateSeconds:
          row.estimate_minutes != null ? row.estimate_minutes * 60 : null,
        timeSpent:
          row.spent_minutes != null ? formatDuration(row.spent_minutes) : null,
        timeSpentSeconds:
          row.spent_minutes != null ? row.spent_minutes * 60 : null,
      },
    },
  };
}

/** All issues visible to the current user (RLS-scoped), as JiraIssue[]. */
export async function fetchAllIssues(): Promise<JiraIssue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIssueToJira);
}

function inRange(value: string | null, start?: string, end?: string) {
  if (!value) return false;
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

/** Issues assigned to a user, optionally overlapping a [start,end] window. */
export async function fetchIssuesForUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<JiraIssue[]> {
  const { data: links, error: lerr } = await supabase
    .from("issue_assignees")
    .select("issue_id")
    .eq("user_id", userId);
  if (lerr) throw new Error(lerr.message);
  const ids = (links ?? []).map((l) => l.issue_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .in("id", ids)
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);

  let issues = data ?? [];
  if (startDate || endDate) {
    issues = issues.filter((row: any) => {
      const start = row.start_date as string | null;
      const due = row.due_date as string | null;
      const within =
        start &&
        due &&
        (!startDate || start >= startDate) &&
        (!endDate || due <= endDate);
      return (
        within ||
        inRange(start, startDate, endDate) ||
        inRange(due, startDate, endDate)
      );
    });
  }
  return issues.map(mapIssueToJira);
}

/** Tasks for a user, defaulting to the current month (dashboard parity). */
export async function fetchUserTasks(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<JiraIssue[]> {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  return fetchIssuesForUser(
    userId,
    startDate || fmt(defaultStart),
    endDate || fmt(defaultEnd)
  );
}

/** A single issue by UUID id, as JiraIssue (RLS-scoped). */
export async function fetchIssueDetail(issueId: string): Promise<JiraIssue> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .eq("id", issueId)
    .single();
  if (error) throw new Error(error.message);
  return mapIssueToJira(data);
}

// ---- Admin task CRUD (maps a task form onto the issues model) ----

/** Resolve the default project (the first project) when none is supplied. */
async function defaultProjectId(): Promise<string> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function createIssue(input: AdminTaskInput): Promise<JiraIssue> {
  const projectId = input.projectId || (await defaultProjectId());

  // Atomic multi-table write (issue + assignee + group link) in one round-trip;
  // RLS still applies (SECURITY INVOKER). The DB trigger allocates key/seq.
  const { data, error } = await supabase.rpc("create_issue_with_assignees", {
    payload: {
      project_id: projectId,
      status_key: input.statusId,
      title: input.title.trim(),
      description: input.description ?? null,
      priority: input.priority ?? "medium",
      type: input.type ?? "task",
      reporter_id: input.reporterId,
      company_id: input.companyId ?? null,
      department_id: input.departmentId ?? null,
      group_id: input.groupId ?? null,
      due_date: input.dueDate ?? null,
      start_date: input.startDate ?? null,
      assignee_id: input.assigneeId ?? null,
      estimate_minutes: parseDuration(input.estimate),
      spent_minutes: parseDuration(input.spent),
    },
  });
  if (error) throw new Error(error.message);
  return fetchIssueDetail(data as string);
}

export async function updateIssue(
  issueId: string,
  input: Partial<AdminTaskInput>
): Promise<JiraIssue> {
  // Only send keys the caller actually provided; the RPC leaves the rest as-is.
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined)
    payload.description = input.description ?? null;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.type !== undefined) payload.type = input.type;
  if (input.companyId !== undefined) payload.company_id = input.companyId ?? null;
  if (input.departmentId !== undefined)
    payload.department_id = input.departmentId ?? null;
  if (input.groupId !== undefined) payload.group_id = input.groupId ?? null;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate ?? null;
  if (input.startDate !== undefined) payload.start_date = input.startDate ?? null;
  if (input.statusId !== undefined) payload.status_key = input.statusId;
  if (input.assigneeId !== undefined)
    payload.assignee_id = input.assigneeId ?? null;
  if (input.estimate !== undefined)
    payload.estimate_minutes = parseDuration(input.estimate);
  if (input.spent !== undefined)
    payload.spent_minutes = parseDuration(input.spent);

  const { error } = await supabase.rpc("update_issue", {
    p_issue_id: issueId,
    payload: payload as never,
  });
  if (error) throw new Error(error.message);
  return fetchIssueDetail(issueId);
}

/** Delete filters on the UUID id — passing the human key throws 22P02. */
export async function deleteIssue(issueId: string): Promise<{ ok: true }> {
  const { error } = await supabase.from("issues").delete().eq("id", issueId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Workflow status columns for a project, ordered (for the status select). */
export async function fetchProjectStatuses(
  projectId: string
): Promise<ProjectStatus[]> {
  const { data, error } = await supabase
    .from("workflow_statuses")
    .select("key, label, category, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s: any) => ({
    key: s.key,
    label: s.label,
    category: s.category,
  }));
}

/** Load an issue's current values for the edit form. */
export async function fetchIssueForEdit(
  issueId: string
): Promise<EditableIssue> {
  const { data, error } = await supabase
    .from("issues")
    .select(
      `id, project_id, title, description, priority, type, due_date, start_date,
       estimate_minutes, spent_minutes, company_id, department_id, group_id,
       status:workflow_statuses!issues_status_id_fkey ( key ),
       assignees:issue_assignees (
         user_id,
         assigner:profiles!issue_assignees_assigned_by_fkey ( display_name )
       )`
    )
    .eq("id", issueId)
    .single();
  if (error) throw new Error(error.message);
  const row = data as any;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description ?? "",
    priority: row.priority,
    type: row.type,
    statusKey: row.status?.key ?? "",
    assigneeId: row.assignees?.[0]?.user_id ?? null,
    companyId: row.company_id ?? null,
    departmentId: row.department_id ?? null,
    groupId: row.group_id ?? null,
    startDate: row.start_date ?? null,
    dueDate: row.due_date ?? null,
    estimate:
      row.estimate_minutes != null ? formatDuration(row.estimate_minutes) : "",
    spent: row.spent_minutes != null ? formatDuration(row.spent_minutes) : "",
    assignedByName: row.assignees?.[0]?.assigner?.display_name ?? null,
  };
}
