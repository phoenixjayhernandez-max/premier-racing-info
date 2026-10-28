-- Premier Racing Info: start the alert and news robots on time.
-- GitHub's free timer often runs hours late, so Supabase starts them instead:
-- alerts every 10 minutes, news every 30 minutes.
-- Paste into Supabase → SQL Editor → New query. Replace PASTE_GITHUB_TOKEN_HERE with your token, then Run.
-- The token only needs "Actions: Read and write" on this one repository.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.robot_config (id int primary key default 1, gh_token text not null);
alter table public.robot_config enable row level security;   -- no policies: not readable from the app
insert into public.robot_config (id, gh_token) values (1, 'PASTE_GITHUB_TOKEN_HERE')
on conflict (id) do update set gh_token = excluded.gh_token;

create or replace function public.kick_robot(wf text) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare t text; rid bigint;
begin
  select gh_token into t from public.robot_config where id = 1;
  select net.http_post(
    url := 'https://api.github.com/repos/phoenixjayhernandez-max/premier-racing-info/actions/workflows/' || wf || '/dispatches',
    body := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || t, 'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28', 'User-Agent', 'premier-racing-info', 'Content-Type', 'application/json')
  ) into rid;
  return rid;
end $$;
revoke all on function public.kick_robot(text) from public, anon, authenticated;

select cron.schedule('pri-alerts', '*/10 * * * *', $$select public.kick_robot('push.yml')$$);
select cron.schedule('pri-news', '*/30 * * * *', $$select public.kick_robot('news.yml')$$);

-- Start one of each right now so you can check it worked.
select public.kick_robot('push.yml');
select public.kick_robot('news.yml');
