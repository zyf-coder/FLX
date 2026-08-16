create table if not exists public.couple_states (
  couple_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_state_backups (
  id bigint generated always as identity primary key,
  couple_id text not null,
  state jsonb not null,
  backed_up_at timestamptz not null default now()
);

create or replace function public.backup_couple_state()
returns trigger language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.couple_state_backups
    where couple_id = old.couple_id
      and backed_up_at > now() - interval '1 day'
  ) then
    insert into public.couple_state_backups (couple_id, state)
    values (old.couple_id, old.state);
  end if;
  return new;
end;
$$;

drop trigger if exists backup_couple_state_daily on public.couple_states;
create trigger backup_couple_state_daily
before update on public.couple_states
for each row execute function public.backup_couple_state();

alter table public.couple_states enable row level security;
alter table public.couple_state_backups enable row level security;

drop policy if exists "anonymous couple state read" on public.couple_states;
drop policy if exists "anonymous couple state insert" on public.couple_states;
drop policy if exists "anonymous couple state update" on public.couple_states;

create policy "anonymous couple state read" on public.couple_states
for select to anon
using (
  couple_id = (current_setting('request.headers', true)::json ->> 'x-couple-id')
);
create policy "anonymous couple state insert" on public.couple_states
for insert to anon
with check (
  couple_id = (current_setting('request.headers', true)::json ->> 'x-couple-id')
);
create policy "anonymous couple state update" on public.couple_states
for update to anon
using (
  couple_id = (current_setting('request.headers', true)::json ->> 'x-couple-id')
)
with check (
  couple_id = (current_setting('request.headers', true)::json ->> 'x-couple-id')
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_states'
  ) then
    alter publication supabase_realtime add table public.couple_states;
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('couple-photos', 'couple-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "couple photo upload" on storage.objects;
drop policy if exists "couple photo delete" on storage.objects;
create policy "couple photo upload" on storage.objects
for insert to anon with check (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = (current_setting('request.headers', true)::json ->> 'x-couple-id')
);
create policy "couple photo delete" on storage.objects
for delete to anon using (
  bucket_id = 'couple-photos'
  and (storage.foldername(name))[1] = (current_setting('request.headers', true)::json ->> 'x-couple-id')
);
