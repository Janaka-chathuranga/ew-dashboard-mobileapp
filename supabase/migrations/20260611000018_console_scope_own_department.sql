-- Broaden console scope: a granted console user manages the departments they
-- head (department_heads) AND their own profile department. This lets a
-- department-lead (who has no department_heads row) who is granted console
-- access manage their own department's groups, in line with the UI scope.

create or replace function public.is_my_department(dept_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.department_heads
      where department_id = dept_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and department_id = dept_id
    );
$$;

-- Re-point the head group-write policy at the broader scope helper.
drop policy if exists groups_head_write on public.groups;
create policy groups_head_write on public.groups
  for all to authenticated
  using (
    public.can_create_groups()
    and department_id is not null
    and public.is_my_department(department_id)
  )
  with check (
    public.can_create_groups()
    and department_id is not null
    and public.is_my_department(department_id)
  );
