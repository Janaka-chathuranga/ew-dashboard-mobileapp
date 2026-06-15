import { supabase } from "@/lib/supabase";

export interface AppNotification {
  id: number;
  type: string;
  issueId: string | null;
  projectId: string | null;
  issueKey: string | null;
  title: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Map a raw notifications row (incl. its jsonb payload) to the app shape. */
export function mapNotification(row: any): AppNotification {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    type: row.type,
    issueId: row.issue_id ?? null,
    projectId: (payload.project_id as string) ?? null,
    issueKey: (payload.issue_key as string) ?? null,
    title: (payload.title as string) ?? null,
    actorId: row.actor_id ?? null,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

/** Recent notifications for the current user (RLS scopes to the recipient). */
export async function fetchNotifications(
  limit = 20
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotification);
}

// No client INSERT — notification rows are written by SECURITY DEFINER DB
// triggers. Clients may only SELECT and UPDATE read_at.

export async function markNotificationRead(id: number) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return { ok: true };
}
