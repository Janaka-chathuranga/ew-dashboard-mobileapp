-- Collaboration & audit tables: comments, attachments, activity_logs, notifications.
-- Tables + RLS are created now to complete the schema; behavioural triggers
-- (activity diffing, notification fan-out) are added in their feature phases.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  issue_id uuid references public.issues(id) on delete cascade,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,
  issue_id uuid references public.issues(id) on delete cascade,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create index comments_issue_id_idx on public.comments(issue_id);
create index attachments_issue_id_idx on public.attachments(issue_id);
create index activity_logs_issue_id_idx on public.activity_logs(issue_id, created_at desc);
create index notifications_recipient_idx on public.notifications(recipient_id, read_at, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

-- comments: visible with the parent issue; author/admin may edit/delete.
create policy comments_select on public.comments
  for select to authenticated using (public.can_see_issue(issue_id));
create policy comments_insert on public.comments
  for insert to authenticated
  with check (public.can_see_issue(issue_id) and author_id = auth.uid());
create policy comments_update on public.comments
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- attachments: visible with the parent issue; uploader/admin may delete.
create policy attachments_select on public.attachments
  for select to authenticated using (public.can_see_issue(issue_id));
create policy attachments_insert on public.attachments
  for insert to authenticated
  with check (public.can_see_issue(issue_id) and uploaded_by = auth.uid());
create policy attachments_delete on public.attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- activity_logs: readable when the parent issue is visible; writes are
-- trigger/service-role only (no client INSERT policy).
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (issue_id is null and public.is_admin() or public.can_see_issue(issue_id));

-- notifications: recipient-scoped read + mark-as-read; inserts via trigger/service.
create policy notifications_select on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
