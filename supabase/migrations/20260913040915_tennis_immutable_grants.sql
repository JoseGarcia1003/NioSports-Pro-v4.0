-- Supabase installations may grant service_role ALL through default privileges.
-- Explicitly remove inherited table grants before granting append-only access.
revoke all on public.tennis_snapshots, public.tennis_analyses from service_role;
grant select, insert on public.tennis_snapshots, public.tennis_analyses to service_role;
alter table public.tennis_analyses add constraint tennis_analysis_status_required check (result ? 'status');
