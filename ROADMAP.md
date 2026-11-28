# Premier Racing Info roadmap

Ideas and plans for later. Nothing here is being built yet unless it says so.

## Next up
- In progress Nov 27, 2026: every series as complete as F1 (SERIES-DATA.md). Built: data file format `data/series/<id>.json`, Calendar/Standings/Drivers tabs and "Next round"/"Latest result" in the app's series sheet, the same sections on `/series/<id>/` pages, tiers (`data/series/tiers.json`: 45 full, 44 partial, 7 limited), check-site section 15, and a Google News search per series so every series gets headlines. Next: fill the files tier by tier (Super Formula first), race pages for those series' rounds, richer race pages (full results, qualifying, standings after the race, past winners at the track), and outreach to limited-tier series.
- Done Nov 27, 2026: per-race share images (link previews) and results titles/descriptions on finished race pages.
- Done Nov 27, 2026: team profiles. `/teams/` directory, 11 F1 team pages (facts only, unclaimed), the "Add or claim your team" form at `/teams/claim/` and a Teams card on every series page. Next: run `setup/team-claims.sql`, then start outreach to grassroots teams (`OUTREACH.md`); later, link teams from race results and add IndyCar/NASCAR/IMSA teams.
- Done Nov 26, 2026: "Weekend results" on the home page (Sun night–Wed; `recapHTML()` in index.html, app races from WINNERS plus directory series from MORE_STATS) and a Sunday 10:45 PM Central results alert (send-push.mjs, shares the "week" setting, link `/#recap`). Visitor guides (getting there, bags and coolers, tips, cooler/parking FAQ) on the COTA, Daytona, Indianapolis and Texas Motor Speedway track pages, from `tools/track-guides.mjs`; Nov 26 later: guides added for Talladega, Charlotte, Road America, Watkins Glen, Sebring, Long Beach, Laguna Seca and Las Vegas (12 tracks in all); 2027 calendars checked against official lists for F1, NASCAR, IndyCar, MotoGP, IMSA and WEC (only change: IMSA Road America moved to Aug 5-8, Carrera Cup NA moved with it, provisional). Re-check guide policies before each season (`checked` dates).
- Done Nov 26, 2026: polish pass. Favorites card layout fix; home page ~1,500px shorter on phones (finished sessions hidden in "On this weekend", next 6 shown; "More racing this weekend" capped at 4, rest behind "Show more"); Wikimedia photos requested at display size (`sized()` in index.html and hero.js) instead of 1600px; static pages (build-pages.mjs) follow the app's light/dark setting. Measured on slow 4G + 4x CPU: first paint ~0.5s, main content ~1.7s. Ash tribute redrawn from Phoenix's photos (high-fives the screen).
- Done Nov 16, 2026: home page conversion fix (GA showed ~66% of visits leave without engaging, nearly all land on `/`). On phones the race now shows on the first screen: a "This weekend / Next race" card in the hero (race name, start time, countdown, opens the race sheet), the hero is shorter on phones, and the featured race moved above the "Start here" box. "Turn on alerts" became series-specific "🔔 Remind me" (hero + featured card): it picks that series and opens the alerts panel. iPhone visitors outside the Home Screen app now get a one-tap "Add <series> to my calendar" button first, since lock screen alerts need the installed app. New GA events: `home_race_tap` (race, from), `home_alert_click` (series, from, already_on). Compare them with `alerts_on` and `add_to_calendar` after a couple of weeks.
- Done Nov 10, 2026: "🔔 Get race alerts" button on every race page and series page. Link `/?alerts=<series>&from=race|series` opens the app with that series picked (Races only) and the alerts panel open. GA event `alert_link_open` (series, from); compare with `alerts_on`.
- Done Nov 10, 2026: alert timing. Settings → Alerts → Starting soon lets people pick Day before, 2 hours, 45 min (default) and/or 15 min (`prefs.leads`). send-push.mjs sends each as its own alert; 2 hours and day-before say the clock time in the person's zone. GA event `alert_lead`.
- Done Nov 10, 2026: weather at the race start. One quiet line under the session times on the race sheet plus a one-line forecast on the home featured race, once the race is within 15 days. Free Open-Meteo forecast fetched by the visitor's browser; track coordinates in `TRACK_LL` (index.html, all 98 tracks). Add a new track's coordinates there or it shows no weather. GA event `weather_shown`.
- Done Nov 9, 2026: eSports tab (`/#esports`) and `/esports/` page: upcoming iRacing special events and pro finals, 2026 champions (F1 Sim Racing, eNASCAR, Porsche Esports Supercup), Gran Turismo World Series, and the official games of real series. Later ideas: add 2027 seasons when announced, start times for pro finals, an iRacing Daytona 24 entry once dated.
- Done Nov 8, 2026: Thursday "this weekend" push alert; data clean-up batch; 2026 season-in-review pages (/recap/, built by build-pages.mjs, only for series tracked all season; NASCAR, IndyCar and MotoGP get theirs in 2027).
- Done Nov 8, 2026: per-race share images for Instagram (tools/make-weekend-post.py), sent to Phoenix every Thursday. Not published on the site.
- Done Nov 8, 2026: fixed a wrong (rugby) home photo. The home hero now only uses the series' own race photos, and track photos must come from a racetrack article (TRACK_TITLE). New "Get the app" guide (iPhone, Android, Mac, Windows; one-click install where the browser allows), in Settings, the footer, the home install box and `/#app`.
- Done Nov 8, 2026: "Start here" setup for new fans (idea from Reddit feedback): pick series, see next sessions in your time zone, add calendar feeds and alerts, then they're saved to My series. Home card for first-time visitors, Settings row, link `/#start`. GA events onboard_open / onboard_done / onboard_skip.
- Done Nov 8, 2026: new logo (Speed Cut PRI + wide wordmark) in the app and page headers, app icons, favicon and share image. Next: use it on Instagram/TikTok profile pictures and merch.
- Done Nov 8, 2026: Settings page (gear icon in the header, footer link, `/#settings`): account, lock screen alerts, calendar sync, time zone, appearance (Light/Dark/Auto), home area, my series, favorites, analytics on/off, clear data, delete account, install, share, about/legal. The old light/dark header button moved into Settings.
- Done Nov 8, 2026: per-series alerts. Fans pick any of the 109 series and, per series, Races / Quali + race / Every session (`pushPrefs.series` + `pushPrefs.level`, stored in push_subs.prefs). 🔔 bell on race and series sheets. Series outside the app's 13 get alerts from `WORLD_TIMES`, so the more start times the Thursday updater fills in there, the more alerts fans get. Old subscriptions keep getting everything (level defaults to "all").
- Done Nov 8, 2026: honest "Free" badges (YouTube search links are now "YouTube highlights", not free), "Free to watch" filter on the Series tab, "Free stream" tag on home. Added 11 US series: Trans Am, CARS Tour, Whelen Modified Tour, ASA STARS, USAC Sprints, Lucas Oil Late Models, WoO Late Models, Super DIRTcar, MX-5 Cup, USF Juniors, GNCC (109 total). Still to verify: free live streams for NLS, 24H Series, Pikes Peak, TCR, ARA, MX-5 Cup; Lucas Oil and GNCC 2026 champions.
- Done Nov 8, 2026: GA4 event tracking (pick_saved, alerts_on, sign_up, login, share, watch_click, ticket_click, add_to_calendar, race_starred, race_going, tab_view, p27_promo_click). Mark pick_saved, alerts_on and sign_up as key events in GA (Admin → Events).
- Done Nov 8, 2026: 2027 season predictions (F1, NASCAR Cup, IndyCar, MotoGP) under Standings → "2027 predictions", home-page promo, share link `/#predict27`. Locks are rows `p27:<series>` in Supabase `pick_locks`. When a 2027 season ends, fill `P27_FINAL` in index.html. Swap driver lists to 2027 grids when they're set (`P27` in index.html).
- Done Nov 1, 2026: standings auto-update now covers all 21 series; NASCAR Cup, IndyCar and MotoGP calendars added (82 races, rest of 2026 + 2027) with race pages.
- "Racing this weekend" page, per-race share images, faster results, weekly email.
- Friends' race photos: add them to `OWN_PHOTOS` in `index.html` once each photographer gives written permission (including for commercial use).
- Direct ticket links per race for series without one official store (NASCAR, Supercars, NHRA and others).

## Later: personal accounts and a fan community (idea, not scheduled)
Phoenix's idea (Oct 31, 2026): make "My account" feel personal, and grow it into a social side of the app where fans share their own race videos and photos.

**Personal account**
- Done Oct 31, 2026: profile photo, display name and bio (private to the account owner), with your photo and first name in the header.
- Profile: display name, photo, home track, favorite series, drivers and teams.
- "My season": races attended (Going/Watched), picks record, badges (for example, first race attended or 5 tracks visited).
- A personal home screen built from your series, your time zone and races near you.

**Community**
- Fans post their own photos and short videos from races, tagged to a race, track or series.
- Posts show on that race's page ("From the stands") and on the poster's profile.
- Links to TikTok, Instagram and YouTube posts, so creators get credit and their own views.
- Likes, follows and comments, kept light.

**Must be in place before launch (legal and safety)**
- Terms for user posts: the poster confirms they own the content and gives the site permission to show it. They keep their copyright.
- Copyright takedowns: a registered DMCA agent with the US Copyright Office and a takedown form.
- Moderation: report button, removal of abusive posts or accounts, filters for nudity and hate, and a review queue.
- Age: 13+ only, with no data collected from under-13s (COPPA).
- Privacy policy update: what is stored, where, and how to delete it.
- Rules for photos of people: no posting private people in ways they'd object to, and no doxxing.
- Storage and cost: links or embeds first; hosted uploads only once traffic and money justify it.

**Business angle**
- Fan posts give each race page fresh content and help SEO.
- Featured creators and partnerships with race photographers.
- Possible later: sponsored "photo of the weekend" or merch tie-ins.

## Monetization (when traffic grows)
- Done Nov 5, 2026: affiliate links for tickets (StubHub), hotels (Booking.com) and streaming (Fubo) are built but switched off. See `MONETIZATION.md` for the programs, the checklist before turning them on, and how to switch each one on.
- Ads (needs the EU/UK consent prompt that is already in place).
- Merch from Phoenix's print shop.
- Before turning on money-making: an LLC or other business setup, and a quick legal check.
