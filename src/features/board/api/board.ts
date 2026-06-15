import { supabase } from "@/lib/supabase";
import { updateIssue } from "@/features/issues";

export interface BoardColumnDef {
  id: string; // workflow_statuses.id, or a category key on the aggregated board
  key: string;
  label: string;
  category: string;
}

export interface BoardIssue {
  id: string;
  key: string;
  title: string;
  type: string;
  priority: string;
  statusId: string;
  boardRank: string | null;
  projectId: string;
  // The column this issue belongs to: status_id (per-project board) or the
  // status category (aggregated "All projects" board).
  columnId: string;
  assignees: { id: string; displayName: string }[];
  assignedByName: string | null;
}

export interface BoardData {
  columns: BoardColumnDef[];
  issues: BoardIssue[];
  // Aggregated board only: project_id -> category -> status key, so moving an
  // issue into a category column resolves the right status for its project.
  statusByProjectCategory?: Record<string, Record<string, string>>;
}

const CATEGORY_COLUMNS: BoardColumnDef[] = [
  { id: "todo", key: "todo", label: "To Do", category: "todo" },
  {
    id: "in_progress",
    key: "in_progress",
    label: "In Progress",
    category: "in_progress",
  },
  { id: "done", key: "done", label: "Done", category: "done" },
];

const BOARD_ISSUE_SELECT = `
  id, key, title, type, priority, status_id, board_rank,
  assignees:issue_assignees (
    profile:profiles!issue_assignees_user_id_fkey ( id, display_name ),
    assigner:profiles!issue_assignees_assigned_by_fkey ( id, display_name )
  )
`;

/** Order within a column by board_rank (nulls last), then key for stability. */
function sortByRank(list: BoardIssue[]) {
  list.sort((a, b) => {
    const ra = a.boardRank ?? "￿";
    const rb = b.boardRank ?? "￿";
    if (ra !== rb) return ra < rb ? -1 : 1;
    return a.key.localeCompare(b.key, undefined, { numeric: true });
  });
}

/** Columns + issues for a project's board (RLS-scoped). */
export async function fetchBoard(projectId: string): Promise<BoardData> {
  const { data: columns, error: cErr } = await supabase
    .from("workflow_statuses")
    .select("id, key, label, category, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (cErr) throw new Error(cErr.message);

  const { data: issues, error: iErr } = await supabase
    .from("issues")
    .select(BOARD_ISSUE_SELECT)
    .eq("project_id", projectId);
  if (iErr) throw new Error(iErr.message);

  const mapped: BoardIssue[] = (issues ?? []).map((row: any) => ({
    id: row.id,
    key: row.key,
    title: row.title,
    type: row.type,
    priority: row.priority,
    statusId: row.status_id,
    boardRank: row.board_rank,
    projectId,
    columnId: row.status_id,
    assignees: (row.assignees ?? [])
      .map((a: any) => a.profile)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, displayName: p.display_name })),
    assignedByName: row.assignees?.[0]?.assigner?.display_name ?? null,
  }));

  sortByRank(mapped);

  return {
    columns: (columns ?? []).map((c: any) => ({
      id: c.id,
      key: c.key,
      label: c.label,
      category: c.category,
    })),
    issues: mapped,
  };
}

/**
 * Aggregated board across ALL projects the user can see (RLS-scoped). Columns
 * are the three status categories; each issue is bucketed by its category.
 */
export async function fetchBoardAll(): Promise<BoardData> {
  const { data: issues, error: iErr } = await supabase
    .from("issues")
    .select(
      `id, key, title, type, priority, status_id, board_rank, project_id,
       status:workflow_statuses!issues_status_id_fkey ( category ),
       assignees:issue_assignees (
         profile:profiles!issue_assignees_user_id_fkey ( id, display_name ),
         assigner:profiles!issue_assignees_assigned_by_fkey ( id, display_name )
       )`
    );
  if (iErr) throw new Error(iErr.message);

  const { data: statuses, error: sErr } = await supabase
    .from("workflow_statuses")
    .select("project_id, key, category");
  if (sErr) throw new Error(sErr.message);
  const statusByProjectCategory: Record<string, Record<string, string>> = {};
  for (const s of statuses ?? []) {
    const pid = (s as any).project_id as string | null;
    if (!pid) continue;
    (statusByProjectCategory[pid] ??= {})[(s as any).category] = (s as any).key;
  }

  const mapped: BoardIssue[] = (issues ?? []).map((row: any) => ({
    id: row.id,
    key: row.key,
    title: row.title,
    type: row.type,
    priority: row.priority,
    statusId: row.status_id,
    boardRank: row.board_rank,
    projectId: row.project_id,
    columnId: row.status?.category ?? "todo",
    assignees: (row.assignees ?? [])
      .map((a: any) => a.profile)
      .filter(Boolean)
      .map((p: any) => ({ id: p.id, displayName: p.display_name })),
    assignedByName: row.assignees?.[0]?.assigner?.display_name ?? null,
  }));

  sortByRank(mapped);

  return { columns: CATEGORY_COLUMNS, issues: mapped, statusByProjectCategory };
}

/**
 * Move an issue to a different status. Uses update_issue (resolves the status by
 * key within the issue's own project), so it works for both the per-project and
 * aggregated boards. Filters on the UUID issue id.
 */
export async function moveIssueToStatus(
  issueId: string,
  statusKey: string
): Promise<void> {
  await updateIssue(issueId, { statusId: statusKey });
}

/**
 * Persist a column's order after a reorder: set status + board_rank for every
 * issue id in `orderedIds`. (Available for future drag-ordering; the mobile
 * board currently changes status via moveIssueToStatus.)
 */
export async function reorderColumn(
  statusId: string,
  orderedIds: string[]
): Promise<void> {
  const { error } = await supabase.rpc("reorder_column", {
    payload: { status_id: statusId, issue_ids: orderedIds },
  });
  if (error) throw new Error(error.message);
}
