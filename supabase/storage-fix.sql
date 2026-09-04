drop policy if exists "couple photo upload" on storage.objects;
drop policy if exists "couple photo delete" on storage.objects;

create policy "couple photo upload" on storage.objects
for insert to anon
with check (bucket_id = 'couple-photos');

create policy "couple photo delete" on storage.objects
for delete to anon
using (bucket_id = 'couple-photos');
