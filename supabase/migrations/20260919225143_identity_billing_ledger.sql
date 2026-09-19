-- Additive migration. Existing historical transactions remain untouched.
create table public.billing_accounts (
  user_id text primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free','pro','elite')),
  subscription_status text not null default 'none',
  current_period_end timestamptz,
  last_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table public.billing_events (
  event_id text primary key, user_id text not null, event_type text not null,
  event_created bigint not null, received_at timestamptz not null default now()
);
alter table public.billing_accounts enable row level security;
alter table public.billing_events enable row level security;
revoke all on public.billing_accounts, public.billing_events from public, anon, authenticated, service_role;
grant select,insert,update on public.billing_accounts to service_role;
grant select,insert on public.billing_events to service_role;

create function public.billing_apply_event(p_id text, p_type text, p_created bigint,
  p_user text, p_customer text, p_subscription text, p_plan text, p_status text, p_end timestamptz)
returns boolean language plpgsql security invoker set search_path = public as $$
declare old public.billing_accounts; inserted integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user, 0));
  insert into billing_events(event_id,user_id,event_type,event_created)
    values(p_id,p_user,p_type,p_created) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return false; end if;
  select * into old from billing_accounts where user_id = p_user;
  if found then
    if old.stripe_customer_id is distinct from p_customer then raise exception 'Customer mismatch'; end if;
    if old.last_event_created > p_created then return false; end if;
    if old.stripe_subscription_id is not null and old.stripe_subscription_id <> p_subscription
      and p_type <> 'checkout.session.completed' then return false; end if;
  end if;
  insert into billing_accounts(user_id,stripe_customer_id,stripe_subscription_id,plan,
    subscription_status,current_period_end,last_event_created)
  values(p_user,p_customer,p_subscription,p_plan,p_status,p_end,p_created)
  on conflict(user_id) do update set stripe_subscription_id=excluded.stripe_subscription_id,
    plan=excluded.plan,subscription_status=excluded.subscription_status,
    current_period_end=excluded.current_period_end,last_event_created=excluded.last_event_created,updated_at=now();
  return true;
end $$;
revoke all on function public.billing_apply_event(text,text,bigint,text,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.billing_apply_event(text,text,bigint,text,text,text,text,text,timestamptz) to service_role;

create table public.bankroll_wallets (
  user_id text primary key,
  available_minor bigint not null default 0 check(available_minor >= 0),
  reserved_minor bigint not null default 0 check(reserved_minor >= 0),
  deposited_minor bigint not null default 0,
  withdrawn_minor bigint not null default 0,
  profit_minor bigint not null default 0,
  settled_stake_minor bigint not null default 0
);
create table public.bankroll_tickets (
  id text primary key, user_id text not null references bankroll_wallets(user_id),
  stake_minor bigint not null check(stake_minor > 0),
  odds numeric(12,4) not null check(odds > 1 and odds <= 1000),
  status text not null default 'pending' check(status in ('pending','win','loss','push','void')),
  note text not null default '', created_at timestamptz not null default now()
);
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  user_id text not null references bankroll_wallets(user_id),
  request_key text not null, request jsonb not null, kind text not null,
  delta_minor bigint not null, balance_minor bigint not null, ticket_id text,
  note text not null default '', created_at timestamptz not null default now(),
  unique(user_id,request_key)
);
create index ledger_user_history on public.ledger_entries(user_id,id desc);
create index tickets_user on public.bankroll_tickets(user_id,created_at desc);
alter table public.bankroll_wallets enable row level security;
alter table public.bankroll_tickets enable row level security;
alter table public.ledger_entries enable row level security;
revoke all on public.bankroll_wallets,public.bankroll_tickets,public.ledger_entries from public,anon,authenticated,service_role;
grant select,insert,update on public.bankroll_wallets,public.bankroll_tickets to service_role;
grant select,insert on public.ledger_entries to service_role;
grant usage,select on sequence public.ledger_entries_id_seq to service_role;

create function public.bankroll_snapshot(p_user text) returns jsonb
language sql security invoker set search_path = public as $$
  select jsonb_build_object(
    'wallet',(select to_jsonb(w) from bankroll_wallets w where user_id=p_user),
    'entries',coalesce((select jsonb_agg(to_jsonb(e) order by e.id desc) from
      (select * from ledger_entries where user_id=p_user order by id desc limit 100) e),'[]'::jsonb),
    'tickets',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from
      (select * from bankroll_tickets where user_id=p_user and status='pending') t),'[]'::jsonb),
    'entryCount',(select count(*) from ledger_entries where user_id=p_user)
  );
$$;
create function public.bankroll_apply(p_user text,p_key text,p_kind text,p_amount bigint,
  p_ticket text,p_odds numeric,p_outcome text,p_note text) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare w bankroll_wallets; t bankroll_tickets; previous ledger_entries;
  fingerprint jsonb; delta bigint; payout bigint; ticket text;
begin
  if p_user is null or length(p_user)=0 or p_key is null or length(p_key)<16 then raise exception 'Invalid identity or key'; end if;
  if p_kind not in ('deposit','withdraw','stake','settle') or p_amount is null or p_amount < 0 or p_amount > 100000000 then raise exception 'Invalid operation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user, 1));
  fingerprint := jsonb_build_array(p_kind,p_amount,p_ticket,p_odds,p_outcome,p_note);
  select * into previous from ledger_entries where user_id=p_user and request_key=p_key;
  if found then
    if previous.request <> fingerprint then raise exception 'Idempotency key reused'; end if;
    return bankroll_snapshot(p_user);
  end if;
  insert into bankroll_wallets(user_id) values(p_user) on conflict do nothing;
  select * into w from bankroll_wallets where user_id=p_user for update;
  if p_kind in ('deposit','withdraw','stake') and p_amount<=0 then raise exception 'Positive amount required'; end if;
  if p_kind='deposit' then
    delta:=p_amount; w.deposited_minor:=w.deposited_minor+p_amount;
  elsif p_kind='withdraw' then
    delta:=-p_amount; w.withdrawn_minor:=w.withdrawn_minor+p_amount;
  elsif p_kind='stake' then
    if p_odds is null or p_odds<=1 or p_odds>1000 then raise exception 'Invalid decimal odds'; end if;
    delta:=-p_amount; w.reserved_minor:=w.reserved_minor+p_amount;
    ticket:=p_user||':'||p_key;
    insert into bankroll_tickets(id,user_id,stake_minor,odds,note) values(ticket,p_user,p_amount,p_odds,p_note);
  else
    if p_amount<>0 or p_outcome is null or p_outcome not in ('win','loss','push','void') then raise exception 'Invalid settlement'; end if;
    select * into t from bankroll_tickets where id=p_ticket and user_id=p_user for update;
    if not found or t.status<>'pending' then raise exception 'Ticket unavailable'; end if;
    payout:=case p_outcome when 'win' then round(t.stake_minor*t.odds) when 'loss' then 0 else t.stake_minor end;
    delta:=payout; ticket:=t.id;
    w.reserved_minor:=w.reserved_minor-t.stake_minor;
    w.profit_minor:=w.profit_minor+payout-t.stake_minor;
    if p_outcome in ('win','loss') then w.settled_stake_minor:=w.settled_stake_minor+t.stake_minor; end if;
    update bankroll_tickets set status=p_outcome where id=t.id;
  end if;
  if w.available_minor+delta<0 then raise exception 'Insufficient balance'; end if;
  w.available_minor:=w.available_minor+delta;
  update bankroll_wallets set available_minor=w.available_minor,reserved_minor=w.reserved_minor,
    deposited_minor=w.deposited_minor,withdrawn_minor=w.withdrawn_minor,
    profit_minor=w.profit_minor,settled_stake_minor=w.settled_stake_minor where user_id=p_user;
  insert into ledger_entries(user_id,request_key,request,kind,delta_minor,balance_minor,ticket_id,note)
    values(p_user,p_key,fingerprint,p_kind,delta,w.available_minor,ticket,p_note);
  return bankroll_snapshot(p_user);
end $$;
revoke all on function public.bankroll_snapshot(text),public.bankroll_apply(text,text,text,bigint,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.bankroll_snapshot(text),public.bankroll_apply(text,text,text,bigint,text,numeric,text,text) to service_role;
