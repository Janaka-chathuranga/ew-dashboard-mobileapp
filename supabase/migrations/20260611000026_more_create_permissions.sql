-- Additional granular "create" permissions, settable per user in the admin
-- console: companies, departments, project roles, and projects. Mirrors the
-- existing can_create_groups / can_create_designations pattern (flag column +
-- SECURITY DEFINER helper + additive RLS write policy). Admins always retain
-- their existing rights; these flags simply extend creation to chosen users.
--
-- ADDITIVE and safe for the shared backend. Apply with: supabase db push

alter table public.profiles
  add column if not exists can_create_companies boolean not null default false,
  add column if not exists can_create_departments boolean not null default false,
  add column if not exists can_create_roles boolean not null default false,
  add column if not exists can_create_projects boolean not null default false;

-- ---------------------------------------------------------------------------
-- Permission helpers (SECURITY DEFINER so RLS policies can call them).
-- ---------------------------------------------------------------------------
create or replace function public.can_create_companies()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_create_companies from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_create_departments()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_create_departments from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_create_roles()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_create_roles from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_create_projects()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select can_create_projects from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- RLS: grant writes on the relevant masters when the flag is set. Additive to
-- the existing admin-only policies (multiple permissive policies are OR'd).
-- ---------------------------------------------------------------------------
create policy companies_priv_write on public.companies
  for all to authenticated
  using (public.can_create_companies()) with check (public.can_create_companies());

create policy departments_priv_write on public.departments
  for all to authenticated
  using (public.can_create_departments()) with check (public.can_create_departments());

create policy project_roles_priv_write on public.project_roles
  for all to authenticated
  using (public.can_create_roles()) with check (public.can_create_roles());

-- ---------------------------------------------------------------------------
-- Projects: creation seeds workflow_statuses + project_members, whose RLS would
-- otherwise block a non-admin. Make create_project SECURITY DEFINER with an
-- explicit entry guard so granted users (and admins / team-leads, as before)
-- can create projects; everyone else is rejected.
-- ---------------------------------------------------------------------------
create or replace function public.create_project(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_lead uuid := coalesce(nullif(payload->>'lead_user_id', '')::uuid, auth.uid());
begin
  if not (public.is_admin() or public.can_create_projects() or public.auth_role() = 'team-lead') then
    raise exception 'You are not allowed to create projects.';
  end if;

  insert into public.projects (key, name, description, lead_user_id, company_id)
  values (
    upper(payload->>'key'),
    payload->>'name',
    nullif(payload->>'description', ''),
    v_lead,
    nullif(payload->>'company_id', '')::uuid
  )
  returning id into v_project_id;

  insert into public.workflow_statuses (project_id, key, label, category, position)
  values
    (v_project_id, 'todo', 'To Do', 'todo', 0),
    (v_project_id, 'in_progress', 'In Progress', 'in_progress', 1),
    (v_project_id, 'done', 'Done', 'done', 2);

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

-- ---------------------------------------------------------------------------
-- Extend the privileged-field guard so non-admin clients cannot self-grant the
-- new flags via a direct profile update (the admin Edge Function, running as
-- service-role, remains exempt).
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.can_manage_tasks is distinct from old.can_manage_tasks
       or new.can_filter_dashboard is distinct from old.can_filter_dashboard
       or new.can_access_console is distinct from old.can_access_console
       or new.can_create_users is distinct from old.can_create_users
       or new.can_create_companies is distinct from old.can_create_companies
       or new.can_create_departments is distinct from old.can_create_departments
       or new.can_create_groups is distinct from old.can_create_groups
       or new.can_create_designations is distinct from old.can_create_designations
       or new.can_create_roles is distinct from old.can_create_roles
       or new.can_create_projects is distinct from old.can_create_projects then
      raise exception 'Only admins can change role, active status, or permissions';
    end if;
  end if;
  return new;
end;
$$;
