-- User roles master: a lookup that drives the role dropdowns in the admin
-- console (create / edit user). The actual profiles.role column is the
-- `user_role` ENUM, and RLS / permission logic keys on those exact values, so
-- this table's `value` MUST match an enum value — it is a display/ordering
-- registry, NOT a place to invent new system roles. Admin-only writes.
--
-- ADDITIVE and safe for the shared backend (the web app is unaffected).
-- Apply with: supabase db push

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

alter table public.user_roles enable row level security;

create policy user_roles_select_all on public.user_roles
  for select to authenticated using (true);
create policy user_roles_admin_write on public.user_roles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Seed the system roles (value = user_role enum value; label = what the UI shows).
insert into public.user_roles (value, label, sort_order) values
  ('member',          'Member',          1),
  ('team-lead',       'Team Lead',       2),
  ('department-lead', 'Department Head', 3),
  ('head',            'Head',            4),
  ('admin',           'Admin',           5)
on conflict (value) do update
  set label = excluded.label, sort_order = excluded.sort_order;

-- Audit parity with the other masters.
drop trigger if exists trg_audit_user_roles on public.user_roles;
create trigger trg_audit_user_roles
  after insert or update or delete on public.user_roles
  for each row execute function public.log_activity();
