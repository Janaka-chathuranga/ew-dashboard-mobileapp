-- Admin-granted task-DELETE permission.
--
-- Goal: admins always, plus department heads / group leads / project leads (or
-- anyone the admin chooses) can DELETE tasks once granted the `can_delete_tasks`
-- flag at user creation (or later via the admin console). Previously deletion
-- was limited to admins and team-leads by role; this replaces that with an
-- explicit, admin-granted permission flag.

alter table public.profiles
  add column if not exists can_delete_tasks boolean not null default false;

-- True when the current user has been granted the task-delete permission.
create or replace function public.can_delete_tasks()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select can_delete_tasks from public.profiles where id = auth.uid()),
    false
  );
$$;

-- issues: admins, or anyone granted the delete permission, may delete tasks.
drop policy if exists issues_delete on public.issues;
create policy issues_delete on public.issues
  for delete to authenticated
  using (public.is_admin() or public.can_delete_tasks());

-- Guard: only admins may change role, active, or any task permission flag
-- (extends the existing guard to cover can_delete_tasks). The service_role
-- admin path is exempt — it does not carry the 'authenticated' JWT role.
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
       or new.can_delete_tasks is distinct from old.can_delete_tasks then
      raise exception 'Only admins can change role, active status, or task permissions';
    end if;
  end if;
  return new;
end;
$$;
