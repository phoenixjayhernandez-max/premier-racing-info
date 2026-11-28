# Team outreach: getting teams onto the site

Goal: build a portfolio of team profiles, the legal way. Start with grassroots and club teams
(SCCA, Spec Miata, MX-5 Cup, Lemons, karting, late models, GT4, F4). They want exposure and they answer DMs.
Big pro teams come later, once there are good examples to show.

## The rules (why this is legal)
- **Unclaimed profile = facts only.** Name, series, base, drivers, results, official site. Facts aren't owned by anyone.
  No logos, no photos, no team-written text, no "partner" wording.
- **Verified profile = only what the team sent us**, through `/teams/claim/`. The form's three boxes are the permission:
  they speak for the team, they own the content (or have the photographer's OK), and they give us a free,
  non-exclusive license to show it. They keep ownership and can pull it any time (Terms → "Team profiles").
- **Verify before publishing.** Either they reply from the team email they gave, or they DM us from the team's
  official Instagram/TikTok. Write how you verified in the `notes` column of `team_claims`.
- Keep every `team_claims` row. It's the record of permission.

## How a team goes live
1. Submission arrives in Supabase → `team_claims` (or by email if the table isn't set up yet).
2. Verify (above). Set `status` to `verified`.
3. Download their logo/photos from the links they sent into `teams/media/<team-id>/`.
4. Add or update the team in `teams.js` with `"status":"verified"`, their bio, logo, photos (with their credit),
   socials and support links, exactly as sent. Run `node tools/build-pages.mjs`, check the page, push.
5. Set `status` to `live` and send them the link (message below). Ask them to share it.

## Messages

**First DM (Instagram/TikTok), with a mock profile ready to show**
> Hey! I run Premier Racing Info (premierracinginfo.com), a free race-weekend site and app for fans.
> We're adding team profiles and I'd love to feature [TEAM]. You'd get a free page with your logo, photos,
> story, socials and buttons for your merch/sponsors, so fans following [SERIES] can find and support you.
> Takes about 5 minutes: premierracinginfo.com/teams/claim/
> No cost, and you can change or remove anything anytime. Want me to set it up?

**Email (team website contact)**
> Subject: Free team profile for [TEAM] on Premier Racing Info
>
> Hi [NAME],
>
> I'm Phoenix, I run Premier Racing Info (premierracinginfo.com), a free site and app that fans use to follow
> race weekends: start times, where to watch, results and standings across 100+ series.
>
> We're building team profiles and would like to include [TEAM]. It's free, and it gives you a page with your
> logo, photos, story and socials, plus links to your merch, sponsorship or fundraising page, linked from the
> [SERIES] page on the site.
>
> You can add everything here in about five minutes: https://premierracinginfo.com/teams/claim/
> You keep ownership of everything you send, and you can change or remove it any time by replying to this email.
>
> Thanks, and good luck at [NEXT RACE]!
> Phoenix
> Premier Racing Info · @premier.racing.info

**Follow-up (once, about a week later)**
> Hey, just bumping this in case it got buried. Happy to build the page for you if you send me your logo and a
> few photos you're cool with us using. Here's the form if that's easier: premierracinginfo.com/teams/claim/

**Verification reply (after they submit)**
> Thanks for sending [TEAM]'s profile! Quick check so nobody can claim a team that isn't theirs:
> can you reply "confirmed" from this email (or DM @premier.racing.info from your team account)?
> Then I'll put the page live.

**Live**
> You're live: premierracinginfo.com/teams/[TEAM-ID]/
> Feel free to share it or put it in your bio. If you want anything changed, just reply here.

## Tracking
Use the `status` column in `team_claims` (new → contacted → verified → live, or rejected).
For teams you've messaged that haven't submitted yet, keep a simple list: team, series, how you contacted them,
date, follow-up date.

## Series data request
For series that publish little (limited tier in `data/series/tiers.json`) or have gaps. Send from contact@premierracinginfo.com to the series' media/PR contact. Log it in the series file (`"asked"`, see SERIES-DATA.md).

> Subject: Schedule and results for [SERIES] on Premier Racing Info
>
> Hi [NAME],
>
> I run Premier Racing Info (premierracinginfo.com), a free guide that shows fans race start times in their own
> time zone, where to watch, results and standings for 100+ racing series. [SERIES] is on the site, and I'd like
> its page to be as complete as the big series: calendar, results after each event, standings and the entry list.
>
> Could you add us to your media list for results and press releases, or point me to where you publish them?
> If you have photos we're allowed to use with credit, we'd love those too.
>
> Everything links back to your official site, and the series page is here: premierracinginfo.com/series/[ID]/
>
> Thanks,
> Phoenix Hernandez
> Premier Racing Info
