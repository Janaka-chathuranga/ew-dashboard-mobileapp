import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface AuditEntry {
  id: number;
  entityType: string;
  entityId: string | null;
  issueId: string | null;
  action: string;
  actorName: string;
  createdAt: string;
  /** Raw change payload: insert→row, delete→row, update→{old,new}. */
  changes: any;
}

export interface AuditChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

// Internal/noisy columns we don't surface in the change detail.
const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at", "legacy_id", "board_rank", "seq"]);

function fmt(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Flatten an entry's `changes` into a list of field rows for the detail view.
 * `resolve` (optional) maps a raw value (e.g. a UUID foreign key) to a friendly
 * name so the detail shows "Engineering" instead of a bare id.
 */
export function describeChanges(
  entry: AuditEntry,
  resolve?: (value: string) => string
): AuditChange[] {
  const c = entry.changes;
  if (!c || typeof c !== "object") return [];
  const rv = (s: string | null): string | null =>
    s == null ? s : resolve ? resolve(s) : s;

  // Update: {old, new} → only the fields that actually changed.
  if (c.old && c.new) {
    const keys = new Set([...Object.keys(c.old), ...Object.keys(c.new)]);
    const rows: AuditChange[] = [];
    for (const k of keys) {
      if (HIDDEN_FIELDS.has(k)) continue;
      const before = fmt(c.old[k]);
      const after = fmt(c.new[k]);
      if (before !== after) rows.push({ field: k, oldValue: rv(before), newValue: rv(after) });
    }
    return rows;
  }

  // Insert / delete: the whole row.
  return Object.keys(c)
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .map((k) => ({
      field: k,
      oldValue: entry.action === "delete" ? rv(fmt(c[k])) : null,
      newValue: entry.action === "delete" ? null : rv(fmt(c[k])),
    }));
}

export function fieldLabel(field: string): string {
  return field
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * The activity / audit trail (RLS-scoped: admins + console users see all, others
 * see issue-scoped entries). Rows are written by the log_activity() DB trigger.
 */
export async function fetchAuditLogs(limit = 100): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(
      "id, entity_type, entity_id, issue_id, action, changes, created_at, actor:profiles!activity_logs_actor_id_fkey ( display_name )"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id ?? null,
    issueId: r.issue_id ?? null,
    action: r.action,
    actorName: r.actor?.display_name ?? "System",
    createdAt: r.created_at,
    changes: r.changes ?? null,
  }));
}

/** Audit log is gated to admins and console-granted users (e.g. heads). */
export function useAuditLogs() {
  const { user, isAuthenticated } = useSession();
  const allowed = user?.role === "admin" || !!user?.canAccessConsole;
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchAuditLogs(100),
    enabled: isAuthenticated && allowed,
    staleTime: 30 * 1000,
  });
}
