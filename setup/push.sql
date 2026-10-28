-- Premier Racing Info: phone notifications.
-- Run once in Supabase → SQL Editor. Replace the three values in the INSERT at the bottom
-- (Claude sends you a ready-to-paste copy with them filled in; never commit the filled copy).

create table if not exists public.push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;   -- no policies: nobody can read it directly

create table if not exists public.push_config (
  id int primary key default 1,
  secret text not null,
  vapid_public text not null,
  vapid_private text not null
);
alter table public.push_config enable row level security;  -- no policies: only the functions below can read it

-- Phones save or update their own subscription (anyone can add their own phone).
create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_prefs jsonb)
returns void language sql security definer set search_path = public as $$
  insert into push_subs(endpoint, p256dh, auth, prefs, updated_at)
  values (p_endpoint, p_p256dh, p_auth, coalesce(p_prefs, '{}'::jsonb), now())
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, prefs = excluded.prefs, updated_at = now();
$$;

create or replace function public.delete_push_sub(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint;
$$;

-- The GitHub robot reads the subscriptions and the sending key, only with the right secret.
create or replace function public.get_push_config(p_secret text)
returns jsonb language sql security definer set search_path = public as $$
  select case when exists (select 1 from push_config where secret = p_secret) then
    jsonb_build_object(
      'vapid_public', (select vapid_public from push_config limit 1),
      'vapid_private', (select vapid_private from push_config limit 1),
      'subs', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth, 'prefs', prefs)) from push_subs), '[]'::jsonb))
  else null end;
$$;

create or replace function public.drop_push_subs(p_secret text, p_endpoints text[])
returns void language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = any(p_endpoints) and exists (select 1 from push_config where secret = p_secret);
$$;

revoke all on function public.save_push_sub(text, text, text, jsonb) from public;
revoke all on function public.delete_push_sub(text) from public;
revoke all on function public.get_push_config(text) from public;
revoke all on function public.drop_push_subs(text, text[]) from public;
grant execute on function public.save_push_sub(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.delete_push_sub(text) to anon, authenticated;
grant execute on function public.get_push_config(text) to anon;
grant execute on function public.drop_push_subs(text, text[]) to anon;

insert into public.push_config (id, secret, vapid_public, vapid_private)
values (1, 'PUSH_SECRET_HERE', 'VAPID_PUBLIC_HERE', 'VAPID_PRIVATE_HERE')
on conflict (id) do update set secret = excluded.secret, vapid_public = excluded.vapid_public, vapid_private = excluded.vapid_private;
