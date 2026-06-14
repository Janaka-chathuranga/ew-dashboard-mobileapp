-- Phase 1: Row Level Security for identity & org tables.
-- Helper functions are SECURITY DEFINER so policies can read profiles without
-- recursively invoking the profiles SELECT policy.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = 'admin', false);
$$;

-- True when the current user leads the given group.
create or replace function public.is_group_lead(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups
    where id = gid and lead_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.departments enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
--   SELECT: any authenticated user (directory)
--   UPDATE: self OR admin. Role/active escalation is guarded by a separate
--           trigger so a non-admin updating their own row cannot change them.
--   INSERT: handled by handle_new_user trigger (security definer) / service role.
-- ---------------------------------------------------------------------------
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Prevent non-admins from escalating role / active on their own row.
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active then
      raise exception 'Only admins can change role or active status';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

-- ---------------------------------------------------------------------------
-- companies / departments / groups: read by all authenticated, write by admin.
-- ---------------------------------------------------------------------------
create policy companies_select_authenticated on public.companies
  for select to authenticated using (true);
create policy companies_admin_write on public.companies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy departments_select_authenticated on public.departments
  for select to authenticated using (true);
create policy departments_admin_write on public.departments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy groups_select_authenticated on public.groups
  for select to authenticated using (true);
create policy groups_admin_write on public.groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- group_members: read by all authenticated; write by admin or the group's lead.
-- ---------------------------------------------------------------------------
create policy group_members_select_authenticated on public.group_members
  for select to authenticated using (true);
create policy group_members_write on public.group_members
  for all to authenticated
  using (public.is_admin() or public.is_group_lead(group_id))
  with check (public.is_admin() or public.is_group_lead(group_id));
