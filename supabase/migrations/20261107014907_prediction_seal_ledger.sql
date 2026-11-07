-- Append-only, hash-chained ledger of sealed predictions (any sport, any market).
-- The database itself checks every insert: the SHA-256 of the stored canonical
-- text must equal the declared hash, the record must name the latest hash as its
-- predecessor, and a live seal must precede the first event it covers. Rows can
-- never be updated, deleted or truncated. External anchors (OpenTimestamps) live
-- in their own append-only table, so the evidence does not rest on this database.
create table if not exists public.prediction_seals (
  seq bigint primary key,
  edition_key text not null unique check (edition_key ~ '^[a-z]+:[a-z0-9_-]+:[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  sport text not null check (sport in ('nba', 'football', 'tennis', 'mlb')),
  market text not null check (market ~ '^[a-z0-9_-]+$'),
  day date not null,
  sealed_at timestamptz not null default now(),
  first_event_at timestamptz not null,
  reveal_after timestamptz not null,
  model_id text not null,
  model_version text not null,
  entry_count integer not null check (entry_count >= 0),
  payload_text text not null,
  hash text not null unique check (hash ~ '^[0-9a-f]{64}$'),
  prev_hash text not null check (prev_hash ~ '^[0-9a-f]{64}$'),
  backfilled boolean not null default false
);

create table if not exists public.prediction_seal_anchors (
  id bigint generated always as identity primary key,
  seal_hash text not null references public.prediction_seals(hash),
  kind text not null check (kind in ('opentimestamps')),
  calendar text not null,
  proof bytea not null check (octet_length(proof) between 40 and 8192),
  created_at timestamptz not null default now(),
  unique (seal_hash, kind, calendar)
);

create or replace function public.prediction_seals_check()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  last_seq bigint;
  last_hash text;
  doc jsonb;
begin
  -- One writer at a time keeps the chain linear.
  perform pg_advisory_xact_lock(hashtext('public.prediction_seals'));
  select seq, hash into last_seq, last_hash from public.prediction_seals order by seq desc limit 1;
  new.seq := coalesce(last_seq, 0) + 1;
  if new.prev_hash is distinct from coalesce(last_hash, repeat('0', 64)) then
    raise exception 'seal_chain_conflict' using errcode = 'P0001';
  end if;
  if new.hash <> encode(sha256(convert_to(new.payload_text, 'UTF8')), 'hex') then
    raise exception 'seal_hash_mismatch' using errcode = 'P0001';
  end if;
  doc := new.payload_text::jsonb;
  if doc->>'schema' <> 'niosports.seal/v1' or doc->>'prevHash' <> new.prev_hash or doc->>'editionKey' <> new.edition_key
     or doc->>'sport' <> new.sport or doc->>'market' <> new.market or (doc->>'day')::date <> new.day
     or (doc->>'firstEventAt')::timestamptz <> new.first_event_at or (doc->>'revealAfter')::timestamptz <> new.reveal_after
     or doc->'model'->>'id' <> new.model_id or doc->'model'->>'version' <> new.model_version
     or jsonb_array_length(doc->'entries') <> new.entry_count then
    raise exception 'seal_columns_disagree_with_payload' using errcode = 'P0001';
  end if;
  new.sealed_at := now();
  if not new.backfilled then
    -- The declared seal time must be the real one and must precede the events.
    if abs(extract(epoch from (doc->>'sealedAt')::timestamptz - new.sealed_at)) > 300 then
      raise exception 'seal_clock_skew' using errcode = 'P0001';
    end if;
    if new.first_event_at <= new.sealed_at then
      raise exception 'seal_after_first_event' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prediction_seals_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Sealed records cannot be modified or deleted';
end;
$$;

drop trigger if exists prediction_seals_insert on public.prediction_seals;
create trigger prediction_seals_insert before insert on public.prediction_seals
  for each row execute function public.prediction_seals_check();
drop trigger if exists prediction_seals_no_change on public.prediction_seals;
create trigger prediction_seals_no_change before update or delete on public.prediction_seals
  for each row execute function public.prediction_seals_immutable();
drop trigger if exists prediction_seals_no_truncate on public.prediction_seals;
create trigger prediction_seals_no_truncate before truncate on public.prediction_seals
  for each statement execute function public.prediction_seals_immutable();
drop trigger if exists prediction_seal_anchors_no_change on public.prediction_seal_anchors;
create trigger prediction_seal_anchors_no_change before update or delete on public.prediction_seal_anchors
  for each row execute function public.prediction_seals_immutable();
drop trigger if exists prediction_seal_anchors_no_truncate on public.prediction_seal_anchors;
create trigger prediction_seal_anchors_no_truncate before truncate on public.prediction_seal_anchors
  for each statement execute function public.prediction_seals_immutable();

alter table public.prediction_seals enable row level security;
alter table public.prediction_seal_anchors enable row level security;
revoke all on public.prediction_seals, public.prediction_seal_anchors from anon, authenticated;
revoke update, delete, truncate on public.prediction_seals, public.prediction_seal_anchors from service_role;
create index if not exists prediction_seals_sport_day on public.prediction_seals (sport, day desc);
