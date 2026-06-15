-- Admin-granted task-management permission.
--
-- Goal: heads / department-leads / group-leads / project-leads (or anyone the
-- admin chooses) can CREATE and manage tasks once the admin grants them the
-- `can_manage_tasks` flag through the admin console. Regular users can already
-- UPDATE issues assigned to them (existing issues_update policy) — this also
-- makes the project/board/status rows readable to those assignees so they can
-- actually reach and edit their own tasks.

alter table public.profiles
  add column if not exists can_manage_tasks boolean not null default false;

-- True when the current user has been granted the task-management permission.
create or replace function public.can_manage_tasks()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select can_manage_tasks from public.profiles where id = auth.uid()),
    false
  );
$$;

-- True when the current user is an assignee of any issue in the given project
-- (lets assignees see the project + its board columns to edit their own tasks).
create or replace function public.is_project_assignee(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.issues i
    join public.issue_assignees a on a.issue_id = i.id
    where i.project_id = pid and a.user_id = auth.uid()
  );
$$;

-- projects: task managers see all; assignees see projects they have work in.
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (
    public.is_admin()
    or public.can_manage_tasks()
    or public.is_project_member(id)
    or public.is_project_assignee(id)
  );

-- workflow_statuses: same widening so create/edit forms can load status columns.
drop policy if exists workflow_statuses_select on public.workflow_statuses;
create policy workflow_statuses_select on public.workflow_statuses
  for select to authenticated
  using (
    project_id is null
    or public.is_admin()
    or public.can_manage_tasks()
    or public.is_project_member(project_id)
    or public.is_project_assignee(project_id)
  );

-- issues: task managers can see/insert/update across projects.
drop policy if exists issues_select on public.issues;
create policy issues_select on public.issues
  for select to authenticated
  using (
    public.is_admin()
    or public.can_manage_tasks()
    or public.is_project_member(project_id)
    or reporter_id = auth.uid()
    or exists (
      select 1 from public.issue_assignees a
      where a.issue_id = id and a.user_id = auth.uid()
    )
  );

drop policy if exists issues_insert on public.issues;
create policy issues_insert on public.issues
  for insert to authenticated
  with check (
    public.is_admin()
    or public.can_manage_tasks()
    or public.is_project_member(project_id)
  );

drop policy if exists issues_update on public.issues;
create policy issues_update on public.issues
  for update to authenticated
  using (
    public.is_admin()
    or public.can_manage_tasks()
    or public.is_project_member(project_id)
    or exists (
      select 1 from public.issue_assignees a
      where a.issue_id = id and a.user_id = auth.uid()
    )
  )
  with check (true);

-- Assignee/group links must resolve when a task manager touches an issue in a
-- project they don't belong to.
create or replace function public.can_see_issue(iid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.can_manage_tasks()
    or exists (
      select 1 from public.issues i
      where i.id = iid
        and (
          public.is_project_member(i.project_id)
          or i.reporter_id = auth.uid()
          or exists (
            select 1 from public.issue_assignees a
            where a.issue_id = i.id and a.user_id = auth.uid()
          )
        )
    );
$$;

-- Guard: only admins may change role, active, or the task permission flag.
-- (Only constrains authenticated end users; the service_role admin path is
-- exempt, as with the previous fix.)
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
       or new.can_manage_tasks is distinct from old.can_manage_tasks then
      raise exception 'Only admins can change role, active status, or task permissions';
    end if;
  end if;
  return new;
end;
$$;
