-- Phase 1 (schema) / Phase 2+ (features): Projects, sprints, workflow statuses, issues.
-- The full schema is created now so identity migration produces a working app
-- (the dashboard reads issues by user); feature UIs land in later phases.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  key text not null unique,
  name text not null,
  description text,
  lead_user_id uuid references public.profiles(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  primary key (project_id, user_id)
);

-- Kanban columns. project_id null = the global default workflow used as a
-- template / fallback for issues not yet scoped to a custom workflow.
create table public.workflow_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  key text not null,
  label text not null,
  category text not null default 'todo' check (category in ('todo', 'in_progress', 'done')),
  position int not null default 0,
  unique (project_id, key)
);

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  goal text,
  state public.sprint_state not null default 'planned',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  key text not null unique,
  seq int not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  sprint_id uuid references public.sprints(id) on delete set null,
  status_id uuid not null references public.workflow_statuses(id),
  title text not null,
  description text,
  priority public.issue_priority not null default 'medium',
  type public.issue_type not null default 'task',
  reporter_id uuid references public.profiles(id) on delete set null,
  parent_id uuid references public.issues(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  board_rank text,
  due_date date,
  start_date date,
  estimate_hours numeric,
  spent_hours numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issue_assignees (
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

create table public.issue_groups (
  issue_id uuid not null references public.issues(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (issue_id, group_id)
);

-- Per-project issue key counter.
create table public.issue_counters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  last_seq int not null default 0
);

-- Allocate seq + key on insert when not explicitly provided (import sets them).
create or replace function public.allocate_issue_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq int;
  v_project_key text;
begin
  if new.seq is not null and new.key is not null then
    -- Keep the counter ahead of explicitly-imported keys.
    insert into public.issue_counters (project_id, last_seq)
    values (new.project_id, new.seq)
    on conflict (project_id)
    do update set last_seq = greatest(public.issue_counters.last_seq, new.seq);
    return new;
  end if;

  insert into public.issue_counters (project_id, last_seq)
  values (new.project_id, 1)
  on conflict (project_id)
  do update set last_seq = public.issue_counters.last_seq + 1
  returning last_seq into v_seq;

  select key into v_project_key from public.projects where id = new.project_id;

  new.seq := v_seq;
  new.key := v_project_key || '-' || v_seq;
  return new;
end;
$$;

create trigger issues_allocate_key
  before insert on public.issues
  for each row execute function public.allocate_issue_key();

-- updated_at triggers
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
create trigger sprints_set_updated_at
  before update on public.sprints
  for each row execute function public.set_updated_at();
create trigger issues_set_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

-- indexes
create index issues_project_id_idx on public.issues(project_id);
create index issues_sprint_id_idx on public.issues(sprint_id);
create index issues_status_id_idx on public.issues(status_id);
create index issues_org_idx on public.issues(company_id, department_id, group_id);
create index issue_assignees_user_id_idx on public.issue_assignees(user_id);
create index project_members_user_id_idx on public.project_members(user_id);
create index sprints_project_id_idx on public.sprints(project_id);
create index workflow_statuses_project_id_idx on public.workflow_statuses(project_id);
