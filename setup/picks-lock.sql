-- Premier Racing Info: lock prediction picks on the server.
-- After a race's lock time nobody can add or change a pick for it (app, API, anything).
-- Lock times live in pick_locks; the notification robot keeps them in sync with the app's race times.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again.

create table if not exists public.pick_locks (key text primary key, locks_at timestamptz not null);
alter table public.pick_locks enable row level security;
drop policy if exists "anyone can read lock times" on public.pick_locks;
create policy "anyone can read lock times" on public.pick_locks for select to anon, authenticated using (true);
grant select on public.pick_locks to anon, authenticated;

-- Block new or changed picks once the race (or the season pick) is locked.
create or replace function public.picks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare l timestamptz;
begin
  if tg_op = 'DELETE' then return old; end if;
  select locks_at into l from public.pick_locks where key = new.key;
  if l is null then raise exception 'Picks for this race are not open yet' using errcode = 'P0001'; end if;
  if now() >= l then raise exception 'Picks are locked: this race has started' using errcode = 'P0001'; end if;
  if tg_op = 'UPDATE' and old.key <> new.key then raise exception 'Can''t move a pick to another race' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists picks_guard on public.picks;
create trigger picks_guard before insert or update on public.picks for each row execute function public.picks_guard();

-- The robot updates lock times (only for races that haven't locked yet), using the push secret.
create or replace function public.set_pick_locks(p_secret text, p_locks jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  if not exists (select 1 from public.push_config where secret = p_secret) then return -1; end if;
  for r in select key, (value #>> '{}')::timestamptz as t from jsonb_each(p_locks) loop
    insert into public.pick_locks(key, locks_at) values (r.key, r.t)
    on conflict (key) do update set locks_at = excluded.locks_at
      where public.pick_locks.locks_at > now() and excluded.locks_at <> public.pick_locks.locks_at;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.set_pick_locks(text, jsonb) from public;
grant execute on function public.set_pick_locks(text, jsonb) to anon;

-- Lock times for the rest of 2026 (the robot adds and updates the rest automatically).
insert into public.pick_locks(key, locks_at) values
  ('f1:season',  '2026-11-01T20:00Z'),
  ('f1:f1-mex',  '2026-11-01T20:00Z'),
  ('f1:f1-bra',  '2026-11-08T17:00Z'),
  ('f1:f1-lv',   '2026-11-21T12:00Z'),
  ('f1:f1-qat',  '2026-11-29T12:00Z'),
  ('f1:f1-abu',  '2026-12-06T12:00Z')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
