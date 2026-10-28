-- Premier Racing Info: prediction picks + leaderboard.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again.

create table if not exists public.picks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,                         -- e.g. "f1:f1-mex" (race podium) or "f1:season"
  pick jsonb not null,
  display_name text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.picks enable row level security;

drop policy if exists "picks readable by signed-in users" on public.picks;
create policy "picks readable by signed-in users" on public.picks for select to authenticated using (true);
drop policy if exists "insert own picks" on public.picks;
create policy "insert own picks" on public.picks for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own picks" on public.picks;
create policy "update own picks" on public.picks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own picks" on public.picks;
create policy "delete own picks" on public.picks for delete to authenticated using (auth.uid() = user_id);

-- The server stamps the time of every save, so picks changed after a race starts can't be backdated.
create or replace function public.picks_stamp() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists picks_stamp on public.picks;
create trigger picks_stamp before insert or update on public.picks for each row execute function public.picks_stamp();
