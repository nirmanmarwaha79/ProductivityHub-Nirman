-- Run this once in Supabase → SQL Editor.
-- Creates a private bucket and policies for each browser's anonymous user.

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- A user's files live under: <auth-user-id>/<project-id>/<file-name>
create policy "Users can view their own project documents"
on storage.objects for select to authenticated
using (bucket_id = 'project-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own project documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own project documents"
on storage.objects for delete to authenticated
using (bucket_id = 'project-documents' and (storage.foldername(name))[1] = auth.uid()::text);
