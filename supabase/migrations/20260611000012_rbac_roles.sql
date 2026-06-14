-- Role-based visibility: explicit leadership roles + multi-department heads.
-- Roles now: admin, head, department-lead, team-lead (group lead), member.
-- A "head" is assigned one or more departments via department_heads.
-- (Visibility itself is enforced in the UI per product decision; this just
--  models the roles/assignments.)

alter type public.user_role add value if not exists 'department-lead';
alter type public.user_role add value if not exists 'head';

create table if not exists public.department_heads (
  department_id uuid not null references public.departments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (department_id, user_id)
);

create index if not exists department_heads_user_id_idx
  on public.department_heads(user_id);

alter table public.department_heads enable row level security;

create policy department_heads_select on public.department_heads
  for select to authenticated using (true);
create policy department_heads_write on public.department_heads
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
