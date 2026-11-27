-- Premier Racing Info: team profile submissions from /teams/claim/.
-- Run once in Supabase → SQL Editor. Until it's run, the form falls back to opening an email
-- to contact@premierracinginfo.com with everything filled in, so no submission is lost.
--
-- Visitors can only ADD a row. Nobody can read, change or delete rows through the website;
-- you read them in Supabase → Table Editor → team_claims. Keep each row: it's the record of the
-- team's permission (the three ok_ boxes + license_version = the date of the terms they agreed to).

create table if not exists public.team_claims (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('claim', 'new')),
  team_id text,                         -- teams.js id when claiming an existing profile
  team_name text not null check (char_length(team_name) between 1 and 120),
  series text not null check (char_length(series) <= 160),
  city text check (char_length(city) <= 120),
  country text check (char_length(country) <= 80),
  website text check (char_length(website) <= 300),
  contact_name text not null check (char_length(contact_name) <= 120),
  contact_role text check (char_length(contact_role) <= 120),
  contact_email text not null check (char_length(contact_email) <= 200 and contact_email like '%@%'),
  verify_handle text check (char_length(verify_handle) <= 120),
  bio text check (char_length(bio) <= 600),
  drivers text check (char_length(drivers) <= 300),
  logo_link text check (char_length(logo_link) <= 500),
  photos_link text check (char_length(photos_link) <= 500),
  photo_credit text check (char_length(photo_credit) <= 200),
  instagram text check (char_length(instagram) <= 300),
  tiktok text check (char_length(tiktok) <= 300),
  youtube text check (char_length(youtube) <= 300),
  facebook text check (char_length(facebook) <= 300),
  merch text check (char_length(merch) <= 300),
  sponsor text check (char_length(sponsor) <= 300),
  donate text check (char_length(donate) <= 300),
  ok_authorized boolean not null check (ok_authorized),
  ok_own boolean not null check (ok_own),
  ok_license boolean not null check (ok_license),
  ok_contact boolean not null default false,
  license_version text not null,        -- date of the terms version shown on the form
  page text check (char_length(page) <= 500),
  status text not null default 'new' check (status in ('new', 'contacted', 'verified', 'live', 'rejected')),
  notes text                            -- your own notes (how you verified it, etc.)
);

alter table public.team_claims enable row level security;

drop policy if exists "anyone can submit a team" on public.team_claims;
create policy "anyone can submit a team" on public.team_claims
  for insert to anon, authenticated
  with check (status = 'new' and notes is null);

-- No select/update/delete policies on purpose: submissions are private.
grant insert on public.team_claims to anon, authenticated;
