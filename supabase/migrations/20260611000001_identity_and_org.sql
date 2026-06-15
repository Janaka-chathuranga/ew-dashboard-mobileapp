-- Phase 1: Identity & organizational hierarchy
-- Enums, org tables (companies/departments/groups), profiles linked to auth.users,
-- group membership, the updated_at trigger, and the handle_new_user trigger.

-- ---------------------------------------------------------------------------
-- Enums (created up-front; later phases reference issue/sprint/notification enums)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'team-lead', 'member');
create type public.issue_priority as enum ('low', 'medium', 'high');
create type public.issue_type as enum ('story', 'task', 'bug', 'epic', 'subtask');
create type public.sprint_state as enum ('planned', 'active', 'completed');
create type public.notification_type as enum (
  'assigned', 'mentioned', 'status_changed', 'commented', 'due_soon'
);

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Org tables. profiles is created before its org FKs to avoid a circular
-- dependency with groups.lead_user_id; the org FKs are added via ALTER below.
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null unique,
  role public.user_role not null default 'member',
  active boolean not null default true,
  avatar_url text,
  legacy_id text,
  -- org FKs added after groups exists (see ALTER below)
  company_id uuid,
  department_id uuid,
  group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  description text,
  lead_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete set null,
  add constraint profiles_department_id_fkey
    foreign key (department_id) references public.departments(id) on delete set null,
  add constraint profiles_group_id_fkey
    foreign key (group_id) references public.groups(id) on delete set null;

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

-- updated_at triggers
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();
create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- indexes
create index departments_company_id_idx on public.departments(company_id);
create index groups_department_id_idx on public.groups(department_id);
create index group_members_user_id_idx on public.group_members(user_id);
create index profiles_role_idx on public.profiles(role);

-- ---------------------------------------------------------------------------
-- handle_new_user: create a profile row when an auth user is created.
-- Reads display_name / role from raw_user_meta_data (set by signUp / admin.createUser).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
