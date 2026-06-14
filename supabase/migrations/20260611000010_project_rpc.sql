-- Atomic project creation: insert the project, seed default workflow statuses
-- (To Do / In Progress / Done), and add the lead + creator as project members.
-- SECURITY INVOKER (default) so RLS applies to every write.

create or replace function public.create_project(payload jsonb)
returns uuid
language plpgsql
as $$
declare
  v_project_id uuid;
  v_lead uuid := coalesce(nullif(payload->>'lead_user_id', '')::uuid, auth.uid());
begin
  insert into public.projects (key, name, description, lead_user_id, company_id)
  values (
    upper(payload->>'key'),
    payload->>'name',
    nullif(payload->>'description', ''),
    v_lead,
    nullif(payload->>'company_id', '')::uuid
  )
  returning id into v_project_id;

  -- Default Kanban workflow.
  insert into public.workflow_statuses (project_id, key, label, category, position)
  values
    (v_project_id, 'todo', 'To Do', 'todo', 0),
    (v_project_id, 'in_progress', 'In Progress', 'in_progress', 1),
    (v_project_id, 'done', 'Done', 'done', 2);

  -- Lead + creator as members (admin role on the project).
  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_lead, 'admin')
  on conflict do nothing;

  if auth.uid() is not null and auth.uid() <> v_lead then
    insert into public.project_members (project_id, user_id, role)
    values (v_project_id, auth.uid(), 'admin')
    on conflict do nothing;
  end if;

  return v_project_id;
end;
$$;
