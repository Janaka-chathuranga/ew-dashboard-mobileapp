-- Unify roles into the single project_roles master, which now drives BOTH the
-- project-member role picker AND the Create/Edit User role dropdown.
--
--   scope       where the role applies: 'user', 'project', or 'both'
--   role_value  for user-facing roles, the user_role ENUM value to store on
--               profiles.role (keeps RLS / permissions valid). NULL for
--               project-only roles.
--
-- The separate user_roles master (added the previous migration) is removed —
-- superseded by this. ADDITIVE/safe otherwise. Apply with: supabase db push

-- Remove the now-superseded user_roles master.
drop trigger if exists trg_audit_user_roles on public.user_roles;
drop table if exists public.user_roles;

alter table public.project_roles
  add column if not exists scope text not null default 'project',
  add column if not exists role_value text;

alter table public.project_roles
  drop constraint if exists project_roles_scope_check;
alter table public.project_roles
  add constraint project_roles_scope_check check (scope in ('user', 'project', 'both'));

alter table public.project_roles
  drop constraint if exists project_roles_role_value_check;
alter table public.project_roles
  add constraint project_roles_role_value_check
  check (role_value is null or role_value in
    ('member', 'team-lead', 'department-lead', 'head', 'admin'));

-- Existing seed rows: Lead = project-only; Member applies to both (→ 'member').
update public.project_roles set scope = 'project', role_value = null  where name = 'Lead';
update public.project_roles set scope = 'both',    role_value = 'member' where name = 'Member';

-- Add the system (user) roles so they appear in the Create User dropdown.
insert into public.project_roles (name, description, scope, role_value) values
  ('Team Lead',       'Team lead',       'user', 'team-lead'),
  ('Department Head', 'Department head', 'user', 'department-lead'),
  ('Head',            'Head',            'user', 'head'),
  ('Admin',           'Administrator',   'user', 'admin')
on conflict (name) do update
  set scope = excluded.scope, role_value = excluded.role_value;
