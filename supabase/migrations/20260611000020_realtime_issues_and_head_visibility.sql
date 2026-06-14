-- Two related changes:
--
-- 1) Realtime for task saves/updates. issues + issue_assignees are added to the
--    supabase_realtime publication so any create/edit (status move, reassign,
--    field edit) is pushed live to every other user whose screen is viewing
--    that task. RLS still governs which change events each client receives, so
--    replica identity is set to FULL (needed for RLS to evaluate UPDATE/DELETE
--    events that only carry the old row).
--
-- 2) Department-head task visibility. The detail modal (To Do / In Progress /
--    Pending Backlog tabs) reads a member's issues, but issues_select only let
--    admins, project members, the reporter, or the assignee read an issue — so
--    a head saw empty task details for their own department's members. A new
--    oversight branch lets a head (department_heads rows) or a department-lead
--    (own profile department) read issues whose assignee — or the issue's own
--    org scope — belongs to a department they oversee. Plain members and
--    team-leads are intentionally NOT granted this (group leads stay group/own
--    scoped via the existing assignee/reporter branches).

-- ---------------------------------------------------------------------------
-- 1. Realtime publication + replica identity
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'issues'
  ) then
    alter publication supabase_realtime add table public.issues;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'issue_assignees'
  ) then
    alter publication supabase_realtime add table public.issue_assignees;
  end if;
end $$;

alter table public.issues replica identity full;
alter table public.issue_assignees replica identity full;

-- ---------------------------------------------------------------------------
-- 2. Department-oversight helper + widened issue visibility
-- ---------------------------------------------------------------------------

-- True when the current user oversees `dept_id`: a head assigned to that
-- department (department_heads), or a department-lead whose own profile is in
-- it. SECURITY DEFINER so it can read department_heads/profiles without
-- tripping their RLS, and so it cannot be widened by the caller's grants.
create or replace function public.oversees_department(dept_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select dept_id is not null and (
    exists (
      select 1 from public.department_heads
      where department_id = dept_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
        and department_id = dept_id
        and role in ('head', 'department-lead')
    )
  );
$$;

-- Single source of truth for "may the current user see this issue". Adds the
-- department-oversight branch; issue_assignees_select / issue_groups_select
-- already delegate here, so the detail modal's assignee read is covered too.
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
          -- Head/department-lead oversight: the issue's own org scope, or any
          -- of its assignees' departments, falls under a department they lead.
          or public.oversees_department(i.department_id)
          or exists (
            select 1
            from public.issue_assignees a
            join public.profiles p on p.id = a.user_id
            where a.issue_id = i.id
              and public.oversees_department(p.department_id)
          )
        )
    );
$$;

-- Re-point issues_select at can_see_issue so the oversight branch applies there
-- too (it previously inlined the conditions and excluded oversight).
drop policy if exists issues_select on public.issues;
create policy issues_select on public.issues
  for select to authenticated
  using (public.can_see_issue(id));
