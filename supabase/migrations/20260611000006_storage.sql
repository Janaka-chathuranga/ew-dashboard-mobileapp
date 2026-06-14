-- Private storage bucket for issue attachments.
-- Path convention: issues/{issue_id}/{attachment_id}/{file_name}
-- so policies can extract the issue_id (2nd path segment) and reuse can_see_issue.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- (storage.foldername(name))[2] is the {issue_id} segment of the path above.
create policy "attachments read when issue visible"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.can_see_issue(((storage.foldername(name))[2])::uuid)
  );

create policy "attachments insert when issue visible"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.can_see_issue(((storage.foldername(name))[2])::uuid)
  );

create policy "attachments delete when issue visible"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.can_see_issue(((storage.foldername(name))[2])::uuid)
  );
