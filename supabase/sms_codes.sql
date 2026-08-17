create table if not exists public.sms_codes (
  lookup_key text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.sms_codes enable row level security;
revoke all on public.sms_codes from anon, authenticated;
