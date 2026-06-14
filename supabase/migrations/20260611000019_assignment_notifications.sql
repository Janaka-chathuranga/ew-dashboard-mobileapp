-- Real-time "task assigned" notifications.
--
-- 1) A SECURITY DEFINER trigger fans out an 'assigned' notification when an
--    issue_assignees row is inserted (skipping self-assignment). It bypasses the
--    notifications RLS, so there is intentionally NO client INSERT policy.
-- 2) update_issue is patched so it only rewrites issue_assignees when the
--    assignee actually changes — otherwise every unrelated edit (the task form
--    always sends assignee_id) would fire a duplicate notification.
--
-- Based on the migration-9 definition of update_issue (keeps estimate_minutes /
-- spent_minutes handling); only the assignee block changed.

-- ---------------------------------------------------------------------------
-- Notification fan-out trigger
-- ---------------------------------------------------------------------------
create or replace function public.notify_issue_assignee()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_issue record;
begin
  -- Don't notify a user about assigning a task to themselves (NULL-safe: a
  -- service-role/system insert with NULL actor still notifies the assignee).
  if NEW.user_id = v_actor then
    return NEW;
  end if;

  select i.project_id, i.key, i.title
    into v_issue
  from public.issues i
  where i.id = NEW.issue_id;

  insert into public.notifications (recipient_id, actor_id, type, issue_id, payload)
  values (
    NEW.user_id,
    v_actor,
    'assigned',
    NEW.issue_id,
    jsonb_build_object(
      'project_id', v_issue.project_id,
      'issue_key', v_issue.key,
      'title', v_issue.title
    )
  );

  return NEW;
end;
$$;

create trigger issue_assignees_notify
  after insert on public.issue_assignees
  for each row execute function public.notify_issue_assignee();

-- ---------------------------------------------------------------------------
-- Patch update_issue: only mutate issue_assignees on a real assignee change.
-- ---------------------------------------------------------------------------
create or replace function public.update_issue(p_issue_id uuid, payload jsonb)
returns uuid
language plpgsql
as $$
declare
  v_project_id uuid;
  v_status_id uuid;
  v_current_assignee uuid;
  v_new_assignee uuid;
begin
  select project_id into v_project_id from public.issues where id = p_issue_id;
  if v_project_id is null then
    raise exception 'Issue % not found', p_issue_id;
  end if;

  if payload ? 'status_key' then
    select id into v_status_id
    from public.workflow_statuses
    where project_id = v_project_id and key = payload->>'status_key';
    if v_status_id is null then
      raise exception 'Unknown status % for project %', payload->>'status_key', v_project_id;
    end if;
  end if;

  update public.issues set
    title = case when payload ? 'title' then payload->>'title' else title end,
    description = case when payload ? 'description'
      then nullif(payload->>'description', '') else description end,
    priority = case when payload ? 'priority'
      then (payload->>'priority')::public.issue_priority else priority end,
    type = case when payload ? 'type'
      then (payload->>'type')::public.issue_type else type end,
    company_id = case when payload ? 'company_id'
      then nullif(payload->>'company_id', '')::uuid else company_id end,
    department_id = case when payload ? 'department_id'
      then nullif(payload->>'department_id', '')::uuid else department_id end,
    group_id = case when payload ? 'group_id'
      then nullif(payload->>'group_id', '')::uuid else group_id end,
    due_date = case when payload ? 'due_date'
      then nullif(payload->>'due_date', '')::date else due_date end,
    start_date = case when payload ? 'start_date'
      then nullif(payload->>'start_date', '')::date else start_date end,
    estimate_minutes = case when payload ? 'estimate_minutes'
      then nullif(payload->>'estimate_minutes', '')::int else estimate_minutes end,
    spent_minutes = case when payload ? 'spent_minutes'
      then nullif(payload->>'spent_minutes', '')::int else spent_minutes end,
    status_id = case when payload ? 'status_key' then v_status_id else status_id end
  where id = p_issue_id;

  -- Single-assignee model: at most one issue_assignees row per issue. Only
  -- delete+reinsert (firing notify_issue_assignee) when the assignee changes.
  if payload ? 'assignee_id' then
    select user_id into v_current_assignee
    from public.issue_assignees
    where issue_id = p_issue_id
    limit 1;

    v_new_assignee := nullif(payload->>'assignee_id', '')::uuid;

    if v_new_assignee is distinct from v_current_assignee then
      delete from public.issue_assignees where issue_id = p_issue_id;
      if v_new_assignee is not null then
        insert into public.issue_assignees (issue_id, user_id)
        values (p_issue_id, v_new_assignee);
      end if;
    end if;
  end if;

  return p_issue_id;
end;
$$;
