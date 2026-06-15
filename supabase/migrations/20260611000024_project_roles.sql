-- Project roles master: a configurable list of roles assignable to project
-- members, managed in the admin console like the other masters
-- (companies / departments / groups / designations). project_members.role stays
-- a free-text column; this master simply governs the choices the UI offers and
-- the "in use" check counts project_members.role = name.
--
-- ADDITIVE and safe for the shared backend (the web app is unaffected).
-- Apply with: supabase db push

create table if not exists public.project_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger project_roles_set_updated_at
  before update on public.project_roles
  for each row execute function public.set_updated_at();

-- RLS: readable by any authenticated user (the pickers need it); admin-only writes.
alter table public.project_roles enable row level security;

create policy project_roles_select_all on public.project_roles
  for select to authenticated using (true);
create policy project_roles_admin_write on public.project_roles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Seed the roles the app shipped with.
insert into public.project_roles (name, description) values
  ('Lead', 'Project lead'),
  ('Member', 'Project member')
on conflict (name) do nothing;

-- Audit parity: track changes like the other masters.
drop trigger if exists trg_audit_project_roles on public.project_roles;
create trigger trg_audit_project_roles
  after insert or update or delete on public.project_roles
  for each row execute function public.log_activity();
