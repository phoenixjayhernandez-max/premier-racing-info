# Sections: how we keep the site up to date

"Update everything" is too big to finish in one go, so the site is split into 13 sections. We work through them **one at a time, in this order**, and a section only counts as done when its "Done means" line is true.

**Start every session the same way:**
1. Run `node tools/check-site.mjs` (or open `STATUS.md`, which the daily rebuild refreshes). It lists every out-of-date item, section by section.
2. Pick the lowest-numbered section that has items. Run just that one with `node tools/check-site.mjs 3` (number or name, e.g. `standings`).
3. Fix everything in it, run the check again until it's clear, then commit.
4. Write the date in the "Last done" column below, then move to the next section.

Sections 1–9 are checked by the script. Sections 10–13 can't be judged by a script, so we go through their checklist by hand about once a month.

| # | Section | What it covers | Data it comes from | Done means | Last done |
|---|---|---|---|---|---|
| 1 | Calendar & race pages | Race dates, session start times, per-session stream links | `RAW`, `SESSIONS`, `SESSION_WATCH` | Every race in the next 7 days has start times; next year's calendar is in for each tracked series | |
| 2 | Results & picks | Winners on race pages, top three for the picks game | `WINNERS`, `PODIUMS`, `RESULT_FOR`, `LIVE` | Every finished race has a winner; every finished F1 race has a `PODIUMS` line | |
| 3 | Standings | Last race, standings and notes for 21 series | `STATS`, `MORE_STATS`, `statsAsof` | Each series' standings are after its most recent race | |
| 4 | Series directory | All 98 series: status, champion or leader, next round | `world.js` | Researched in the last 7 days; no passed "next" dates; finished seasons have a champion | |
| 5 | Watch | Where to watch in the US, start times for other series | `WATCH`, `world.js` watch, `WORLD_TIMES` | Every series has watch links; every series racing this weekend has a start time | |
| 6 | Tickets | Official ticket links per race and series | `TICKETS`, `SERIES_TICKETS`, `CIRCUIT_SITES` | Every race in the next 60 days has an official link, not just a Google search | |
| 7 | Tracks & races near you | Track pages, state and country lists | `GEO`, `CIRCUIT_SITES` | Every upcoming circuit has a location and website | |
| 8 | News | Headlines every 30 minutes | `news.json`, `tools/fetch-news.mjs` | Collected in the last 2 hours; every active tracked series has headlines this week | |
| 9 | Search pages | ~530 generated pages, sitemap, home page crawlable block | `tools/build-pages.mjs` | Rebuilt today | |
| 10 | Photos | Hero and race photos | `PHOTO_QUERIES`, `PHOTO_NEED`, `OWN_PHOTOS` | See checklist below | |
| 11 | Accounts, alerts & picks game | Sign-in, profile, push alerts, predictions | Supabase, `tools/send-push.mjs` | See checklist below | |
| 12 | Design & speed | Looks, phone layout, load time | `index.html` CSS/UI, `sw.js` | See checklist below | |
| 13 | Legal pages | Terms, Privacy, consent | `about/`, `privacy/`, `terms/` | See checklist below | |

## Hand checklists

**10. Photos**
- [ ] Open each tracked series' page: the photo is of that exact series (F1≠F2≠F3, NASCAR Cup only Cup, MotoGP≠Moto2≠Moto3).
- [ ] Every photo has a credit and a license.
- [ ] Any friend photos with written permission are added to `OWN_PHOTOS`.

**11. Accounts, alerts & picks game**
- [ ] Sign in, edit profile, sign out all work.
- [ ] Send a test notification (Actions → Send notifications → test) and it arrives.
- [ ] Picks lock at the next Grand Prix start and last race's picks are scored.

**12. Design & speed**
- [ ] Home, Series, Standings, Tickets and a race page look right on a phone, in light and dark.
- [ ] No errors in the browser console.
- [ ] `sw.js` cache name was bumped after the last UI change.

**13. Legal pages**
- [ ] Terms and Privacy still match what the site does (accounts, alerts, analytics, any affiliate links).
- [ ] "Not affiliated" notice is in the footer; EU/UK consent prompt shows.
- [ ] No personal email on the site.
