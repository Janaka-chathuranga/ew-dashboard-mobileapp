-- Admin-granted "department console" capabilities for heads.
--
-- A head (or anyone the admin chooses) can be granted access to a SCOPED view
-- of the admin console plus individual create capabilities. Each capability is
-- a separate flag (per-capability toggles):
--   can_access_console      -> may open /admin (auto-scoped to their depts)
--   can_create_users        -> may create/edit users within their departments
--   can_create_groups       -> may create groups within their departments
--   can_create_designations -> may create designations (global master)
--   (task creation reuses the existing can_manage_tasks flag)
--
-- User creation runs through the service-role server action, which enforces the
-- department scope + non-admin role restriction. Group/designation writes are
-- enforced here in RLS so the client cannot exceed its grant.

alter table public.profiles
  add column if not exists can_access_console boolean not null default false,
  add column if not exists can_create_users boolean not null default false,
  add column if not exists can_create_groups boolean not null default false,
  add column if not exists can_create_designations boolean not null default false;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_department_head(dept_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.department_heads
    where department_id = dept_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_create_groups()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select can_create_groups from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.can_create_designations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select can_create_designations from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: heads may write groups within their own departments, and designations
-- (a global master) when granted. These are additive to the admin policies.
-- ---------------------------------------------------------------------------
create policy groups_head_write on public.groups
  for all to authenticated
  using (
    public.can_create_groups()
    and department_id is not null
    and public.is_department_head(department_id)
  )
  with check (
    public.can_create_groups()
    and department_id is not null
    and public.is_department_head(department_id)
  );

create policy designations_head_write on public.designations
  for all to authenticated
  using (public.can_create_designations())
  with check (public.can_create_designations());

-- ---------------------------------------------------------------------------
-- Guard: only admins may toggle any of the privilege flags on a profile.
-- (Service-role writes from the admin server action remain exempt.)
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
       or new.can_create_groups is distinct from old.can_create_groups
       or new.can_create_designations is distinct from old.can_create_designations then
      raise exception 'Only admins can change role, active status, or permissions';
    end if;
  end if;
  return new;
end;
$$;
