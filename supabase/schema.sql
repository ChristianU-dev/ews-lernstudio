-- ============================================================================
-- EWS Lernstudio & Universal Study Buddy — Cloud-Sync & Google-OAuth Schema
-- Kopiere dieses Skript einmalig in den SQL-Editor deines Supabase-Projekts
-- und klicke auf "Run". Es werden keinerlei Bezahldaten benötigt (Free Tier).
-- ============================================================================

create table if not exists public.ews_sync_records (
  sync_key text not null,
  collection text not null,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (sync_key, collection, record_id)
);

create index if not exists idx_ews_sync_key_updated
  on public.ews_sync_records (sync_key, updated_at desc);

alter table public.ews_sync_records enable row level security;

-- 1. Google-Account OAuth Schutz: Jeder eingeloggte Google-Nutzer greift isoliert
--    nur auf seinen eigenen Schlüsselraum (`google:<auth.uid()>`) zu!
drop policy if exists "Allow Google OAuth user sync" on public.ews_sync_records;
create policy "Allow Google OAuth user sync"
  on public.ews_sync_records
  for all
  using (
    auth.uid() is not null
    and sync_key = ('google:' || auth.uid()::text)
  )
  with check (
    auth.uid() is not null
    and sync_key = ('google:' || auth.uid()::text)
  );

-- 2. Alternativer Schnell-Sync per persönlichem Geheim-Code (ohne E-Mail-Login):
drop policy if exists "Allow sync via personal sync_key" on public.ews_sync_records;
create policy "Allow sync via personal sync_key"
  on public.ews_sync_records
  for all
  using (
    sync_key not like 'google:%'
    and char_length(sync_key) >= 8
  )
  with check (
    sync_key not like 'google:%'
    and char_length(sync_key) >= 8
  );
