# Premier Racing Info roadmap

Ideas and plans for later. Nothing here is being built yet unless it says so.

## Next up
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
