-- Trigger only uses PostgreSQL built-ins; exclude caller-controlled schemas.
alter function public.update_updated_at() set search_path = pg_catalog;
