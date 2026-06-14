-- RLS for the Jira layer (projects, sprints, statuses, issues and links).

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

-- Visibility of an issue for the current user: admin, project member,
-- assignee, or reporter.
create or replace function public.can_see_issue(iid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
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

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.workflow_statuses enable row level security;
alter table public.sprints enable row level security;
alter table public.issues enable row level security;
alter table public.issue_assignees enable row level security;
alter table public.issue_groups enable row level security;
alter table public.issue_counters enable row level security;

-- projects
create policy projects_select on public.projects
  for select to authenticated
  using (public.is_admin() or public.is_project_member(id));
create policy projects_write on public.projects
  for all to authenticated
  using (public.is_admin() or lead_user_id = auth.uid())
  with check (public.is_admin() or lead_user_id = auth.uid());

-- project_members
create policy project_members_select on public.project_members
  for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id) or user_id = auth.uid());
create policy project_members_write on public.project_members
  for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.projects p
    where p.id = project_id and p.lead_user_id = auth.uid()
  ))
  with check (public.is_admin() or exists (
    select 1 from public.projects p
    where p.id = project_id and p.lead_user_id = auth.uid()
  ));

-- workflow_statuses
create policy workflow_statuses_select on public.workflow_statuses
  for select to authenticated
  using (project_id is null or public.is_admin() or public.is_project_member(project_id));
create policy workflow_statuses_write on public.workflow_statuses
  for all to authenticated
  using (public.is_admin() or public.auth_role() = 'team-lead')
  with check (public.is_admin() or public.auth_role() = 'team-lead');

-- sprints
create policy sprints_select on public.sprints
  for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy sprints_write on public.sprints
  for all to authenticated
  using (public.is_admin() or public.auth_role() = 'team-lead')
  with check (public.is_admin() or public.auth_role() = 'team-lead');

-- issues
create policy issues_select on public.issues
  for select to authenticated
  using (
    public.is_admin()
    or public.is_project_member(project_id)
    or reporter_id = auth.uid()
    or exists (
      select 1 from public.issue_assignees a
      where a.issue_id = id and a.user_id = auth.uid()
    )
  );
create policy issues_insert on public.issues
  for insert to authenticated
  with check (public.is_admin() or public.is_project_member(project_id));
create policy issues_update on public.issues
  for update to authenticated
  using (
    public.is_admin()
    or public.is_project_member(project_id)
    or exists (
      select 1 from public.issue_assignees a
      where a.issue_id = id and a.user_id = auth.uid()
    )
  )
  with check (true);
create policy issues_delete on public.issues
  for delete to authenticated
  using (public.is_admin() or public.auth_role() = 'team-lead');

-- issue_assignees / issue_groups inherit issue visibility
create policy issue_assignees_select on public.issue_assignees
  for select to authenticated using (public.can_see_issue(issue_id));
create policy issue_assignees_write on public.issue_assignees
  for all to authenticated
  using (public.can_see_issue(issue_id))
  with check (public.can_see_issue(issue_id));

create policy issue_groups_select on public.issue_groups
  for select to authenticated using (public.can_see_issue(issue_id));
create policy issue_groups_write on public.issue_groups
  for all to authenticated
  using (public.can_see_issue(issue_id))
  with check (public.can_see_issue(issue_id));

-- issue_counters: managed by triggers (security definer); no client access needed.
create policy issue_counters_select on public.issue_counters
  for select to authenticated using (public.is_admin());
