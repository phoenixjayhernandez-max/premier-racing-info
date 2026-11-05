# Premier Racing Info: project notes for a new chat

Read this first. It replaces the long original chat (Oct–Nov 2026).

## What it is
Free race-weekend site/PWA at https://premierracinginfo.com (GitHub Pages, Cloudflare DNS only). Owner: Phoenix (San Antonio, TX; TikTok/YouTube ASHJAYLAPS). Times are shown in the visitor's time zone (default US Central).

## How it's built
- `index.html`: the whole app (one file: CSS in one `<style>`, data constants + UI in the first big `<script>`). Light/dark theme, electric-blue accent, Saira Condensed + Albert Sans (self-hosted in `/fonts`).
- Data constants in index.html: `RAW` (calendar: 13 series f1, nascar, indy, motogp, imsa, wec, gtwc, gte, gtas, gtau, psc, pccna, mustang; 2027 ids end `-27`), `SESSIONS` (UTC times), `SESSION_WATCH` (per-session stream links), `WORLD_TIMES` (start times for other series), `STATS` + `MORE_STATS` (standings for 21 series), `WINNERS`, `LIVE`, `PODIUMS` (picks game; never remove lines), `WATCH`, `TICKETS`, `CIRCUIT_SITES`, `GEO`, `PHOTO_QUERIES`/`PHOTO_NEED`/`OWN_PHOTOS`.
- `world.js`: directory of 98 series (Series tab). Series with an `app` field are full calendars.
- `tools/build-pages.mjs`: generates ~530 SEO pages (races/, series/, tracks/, races-in/, calendar/, watch/, tickets/, about/, privacy/, terms/), `hero.js`, `llms.txt`, sitemap, and the crawlable block between `<!--seo-->` and `<!--/seo-->` in index.html. Run `node tools/build-pages.mjs` after data changes.
- `tools/build-ics.mjs`: calendar feeds in `calendar/`.
- `sw.js`: service worker, network-first. Bump the cache name (`pri-vNN`) on every UI change.
- GitHub Actions: news.yml (news.json), push.yml (alerts), pages.yml (daily rebuild). Supabase holds accounts/picks/alerts (publishable key only — never commit secrets).

## Rules we settled on
- Photos: only licensed photos (Wikimedia Commons searches per series, Openverse backup), credited. Strict per-series matching: F1≠F2≠F3≠F4≠FE, NASCAR Cup only Cup, MotoGP≠Moto2≠Moto3; only GT3 regions and Porsche Cups share. No photo is better than a wrong one. Friends' photos go in `OWN_PHOTOS` once they give written permission (incl. commercial use).
- Legal: Terms + Privacy pages, "not affiliated" notice, EU/UK analytics consent, no press-agency photos. Don't publish Phoenix's personal email on the site.
- Analytics: Google Analytics G-2XEE8686TF + Cloudflare Web Analytics. Search Console verified, sitemap submitted.
- SEO: answer sentence + "Questions fans ask" FAQ (FAQPage schema) on race/series/watch pages; titles ≤60 chars.

## Automatic updater (scheduled task "Premier Racing Info auto-update")
Runs Thu, Sat and Sun at 10:25 PM Central. It starts from `node tools/check-site.mjs` sections 1–5 and works every item. Thursday: start times, watch links, late results, Series directory. Sat/Sun: results and standings. It edits only the data constants and pushes to main.

## Working tips
- Clone: `git clone https://github.com/phoenixjayhernandez-max/premier-racing-info`
- Test locally: `python3 -m http.server 8765` then load it with Playwright (Chromium is preinstalled).
- Commit, then push with `git pull --rebase` retries (robots push often).
- Plans and ideas: see `ROADMAP.md`.

## Keeping it up to date, section by section
The site is split into 13 sections (calendar, results, standings, series directory, watch, tickets, tracks, news, search pages, photos, accounts, design, legal). See `SECTIONS.md`. Run `node tools/check-site.mjs` to list what's out of date in each one (the daily rebuild saves it to `STATUS.md`), then fix one section at a time, lowest number first.
