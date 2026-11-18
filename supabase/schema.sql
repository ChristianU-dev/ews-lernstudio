-- ============================================================================
-- EWS-Psychologie Lernstudio — Kostenloser Echtzeit-Sync (Supabase Free Tier)
-- Kopiere dieses Skript einmalig in den SQL-Editor deines Supabase-Projekts
-- und klicke auf "Run". Es werden keinerlei Bezahldaten benötigt.
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

-- Persönlicher Sync-Schlüssel (z. B. langer geheimer Code in den Einstellungen)
-- erlaubt nahtlosen Sync zwischen PC und iPhone ohne komplizierten E-Mail-Zwang.
drop policy if exists "Allow sync via personal sync_key" on public.ews_sync_records;
create policy "Allow sync via personal sync_key"
  on public.ews_sync_records
  for all
  using (char_length(sync_key) >= 8)
  with check (char_length(sync_key) >= 8);
