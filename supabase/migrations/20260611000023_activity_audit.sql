-- Audit logging: populate public.activity_logs on every change to the core
-- tables, and let admins / console users read the full trail.
--
-- WHY: the activity_logs table existed (collaboration migration) but nothing
-- wrote to it and nothing read it. This adds a generic SECURITY DEFINER trigger
-- that records who (auth.uid()) changed what (table + id), the action, and the
-- before/after row as jsonb. Reads stay RLS-gated: admins and console-granted
-- users see everything; everyone else sees only issue-scoped entries they can
-- already see (can_see_issue).
--
-- This is ADDITIVE and safe for the shared backend (web app continues to work).
-- Apply with: supabase db push   (or via the SQL editor).

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity uuid;
  v_issue uuid;
  v_changes jsonb;
begin
  -- Resolve the entity id + optional issue linkage per table. Join tables have
  -- no single `id` column, so map them onto their most meaningful uuid.
  if tg_table_name = 'issue_assignees' then
    v_issue := case when tg_op = 'DELETE' then old.issue_id else new.issue_id end;
    v_entity := v_issue;
  elsif tg_table_name = 'project_members' then
    v_entity := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  elsif tg_table_name = 'department_heads' then
    v_entity := case when tg_op = 'DELETE' then old.department_id else new.department_id end;
  else
    v_entity := case when tg_op = 'DELETE' then old.id else new.id end;
    if tg_table_name = 'issues' then
      v_issue := v_entity;
    end if;
  end if;

  if tg_op = 'INSERT' then
    v_changes := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_changes := to_jsonb(old);
  else
    v_changes := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  insert into public.activity_logs (
    actor_id, entity_type, entity_id, issue_id, action, changes
  )
  values (
    auth.uid(), tg_table_name, v_entity, v_issue, lower(tg_op), v_changes
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Attach the audit trigger to the core tables.
do $$
declare
  t text;
  tables text[] := array[
    'issues', 'issue_assignees', 'projects', 'project_members',
    'profiles', 'companies', 'departments', 'groups', 'designations',
    'department_heads'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s;', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.log_activity();', t
    );
  end loop;
end $$;

-- Broaden read access: admins + console-granted users see the whole trail;
-- others keep issue-scoped visibility.
drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and can_access_console
    )
    or (issue_id is not null and public.can_see_issue(issue_id))
  );
