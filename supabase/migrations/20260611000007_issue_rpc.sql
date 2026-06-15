-- Atomic issue write RPCs, invoked via supabase.rpc(). SECURITY INVOKER (default)
-- so the caller's RLS still applies — these just bundle the multi-table write
-- (issue + assignee + group link, status-key resolution) into one round-trip.

create or replace function public.create_issue_with_assignees(payload jsonb)
returns uuid
language plpgsql
as $$
declare
  v_project_id uuid := (payload->>'project_id')::uuid;
  v_status_id uuid;
  v_issue_id uuid;
  v_assignee uuid;
  v_group uuid;
begin
  select id into v_status_id
  from public.workflow_statuses
  where project_id = v_project_id and key = payload->>'status_key';
  if v_status_id is null then
    raise exception 'Unknown status % for project %', payload->>'status_key', v_project_id;
  end if;

  insert into public.issues (
    project_id, status_id, title, description, priority, type,
    reporter_id, company_id, department_id, group_id, due_date, start_date
  )
  values (
    v_project_id,
    v_status_id,
    payload->>'title',
    nullif(payload->>'description', ''),
    coalesce((payload->>'priority')::public.issue_priority, 'medium'),
    coalesce((payload->>'type')::public.issue_type, 'task'),
    nullif(payload->>'reporter_id', '')::uuid,
    nullif(payload->>'company_id', '')::uuid,
    nullif(payload->>'department_id', '')::uuid,
    nullif(payload->>'group_id', '')::uuid,
    nullif(payload->>'due_date', '')::date,
    nullif(payload->>'start_date', '')::date
  )
  returning id into v_issue_id;

  v_assignee := coalesce(
    nullif(payload->>'assignee_id', '')::uuid,
    nullif(payload->>'reporter_id', '')::uuid
  );
  if v_assignee is not null then
    insert into public.issue_assignees (issue_id, user_id)
    values (v_issue_id, v_assignee)
    on conflict do nothing;
  end if;

  v_group := nullif(payload->>'group_id', '')::uuid;
  if v_group is not null then
    insert into public.issue_groups (issue_id, group_id)
    values (v_issue_id, v_group)
    on conflict do nothing;
  end if;

  return v_issue_id;
end;
$$;

create or replace function public.update_issue(p_issue_id uuid, payload jsonb)
returns uuid
language plpgsql
as $$
declare
  v_project_id uuid;
  v_status_id uuid;
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
    status_id = case when payload ? 'status_key' then v_status_id else status_id end
  where id = p_issue_id;

  if payload ? 'assignee_id' then
    delete from public.issue_assignees where issue_id = p_issue_id;
    if nullif(payload->>'assignee_id', '') is not null then
      insert into public.issue_assignees (issue_id, user_id)
      values (p_issue_id, (payload->>'assignee_id')::uuid);
    end if;
  end if;

  return p_issue_id;
end;
$$;
