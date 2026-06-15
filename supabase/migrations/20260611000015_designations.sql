-- Designations master + profile designation link + registration-form reads.
-- Adds a configurable "designation" (job title) master managed in the admin
-- console, links it onto profiles, lets the public registration form read the
-- org structure it needs for its dropdowns, and captures the company /
-- department / designation chosen at signup via handle_new_user.

-- ---------------------------------------------------------------------------
-- Designations master
-- ---------------------------------------------------------------------------
create table public.designations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger designations_set_updated_at
  before update on public.designations
  for each row execute function public.set_updated_at();

alter table public.profiles
  add column if not exists designation_id uuid
    references public.designations(id) on delete set null;

create index if not exists profiles_designation_id_idx
  on public.profiles(designation_id);

-- ---------------------------------------------------------------------------
-- RLS: designations readable by everyone (incl. the public registration
-- form, which is unauthenticated); writable by admins only.
-- ---------------------------------------------------------------------------
alter table public.designations enable row level security;

create policy designations_select_all on public.designations
  for select to anon, authenticated using (true);
create policy designations_admin_write on public.designations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Let the unauthenticated registration form read org structure for its
-- dropdowns. These are additive (OR'd with the existing authenticated reads).
create policy companies_select_anon on public.companies
  for select to anon using (true);
create policy departments_select_anon on public.departments
  for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Extend the new-user handler to capture org + designation picked at signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, display_name, email, role,
    company_id, department_id, designation_id
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'member'),
    nullif(new.raw_user_meta_data->>'company_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'department_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'designation_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
