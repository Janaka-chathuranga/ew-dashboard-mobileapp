-- Admin-granted dashboard-filtering permission.
--
-- Lets the admin grant heads / department-leads / group-leads (or anyone) the
-- ability to use the cascading dashboard filters (department / group / project
-- / user, scoped to what their role can already see). Filtering is a UI concern
-- (profiles are readable by all authenticated users and visibility is enforced
-- in the UI), so this is just a profile flag — no new RLS is required.

alter table public.profiles
  add column if not exists can_filter_dashboard boolean not null default false;

-- Extend the privileged-field guard so only admins can toggle the flag.
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
       or new.can_filter_dashboard is distinct from old.can_filter_dashboard then
      raise exception 'Only admins can change role, active status, or permissions';
    end if;
  end if;
  return new;
end;
$$;
