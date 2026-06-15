-- Track WHO assigned a task (distinct from the assignee and the reporter).
--
-- reporter_id isn't reliable as "the assigner": the admin task panel sets the
-- reporter to the assignee themselves. Instead we stamp the actor on the
-- assignment row. The column defaults to auth.uid(), so both issue-write RPCs
-- (create_issue_with_assignees / update_issue), which insert
-- issue_assignees(issue_id, user_id), capture the acting user automatically —
-- no RPC change needed. Existing rows are backfilled with the issue reporter as
-- a best guess.
--
-- NOTE: this adds a SECOND foreign key from issue_assignees to profiles, so
-- every PostgREST embed of issue_assignees->profiles must now disambiguate with
-- an explicit FK hint (issue_assignees_user_id_fkey vs
-- issue_assignees_assigned_by_fkey) — handled in the query layer.

alter table public.issue_assignees
  add column if not exists assigned_by uuid
    references public.profiles(id) on delete set null
    default auth.uid();

-- Backfill historical assignments with the issue's reporter.
update public.issue_assignees a
set assigned_by = i.reporter_id
from public.issues i
where i.id = a.issue_id
  and a.assigned_by is null;
