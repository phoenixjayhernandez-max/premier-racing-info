-- Premier Racing Info: account storage. Paste into Supabase → SQL Editor → New query → Run.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each person can only see and change their own row.
create policy "Read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Create own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Delete own profile" on public.profiles for delete using (auth.uid() = id);
