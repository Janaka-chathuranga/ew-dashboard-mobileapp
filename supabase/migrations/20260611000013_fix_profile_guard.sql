-- Fix: the privileged-field guard must only constrain authenticated END USERS
-- (publishable-key clients). Admin user management runs via the secret-key
-- (service_role) client, which has no auth.uid() and was being wrongly blocked
-- from changing role/active. Skip the guard for non-authenticated roles
-- (service_role, and direct postgres for migrations/seed).

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
       or new.active is distinct from old.active then
      raise exception 'Only admins can change role or active status';
    end if;
  end if;
  return new;
end;
$$;
