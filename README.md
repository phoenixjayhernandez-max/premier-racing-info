# Premier Racing Info

F1, IMSA, WEC, all four GT World Challenge series, Porsche Supercup, Porsche Carrera Cup North America
and the Ford Mustang Challenge: race weekends, results, standings, where to watch, and session start
times in Texas (Central) time.

This is an installable web app (PWA). It needs no app store and costs nothing to host.

## Put it online for free (GitHub Pages)
1. Create a free account at github.com.
2. New repository → name it `premier-racing-info` → Public → Create.
3. "uploading an existing file" → drag in everything from this folder (index.html, manifest.webmanifest,
   sw.js, the icons folder, README.md) → Commit.
4. Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / root → Save.
5. After a minute it's live at `https://YOUR-USERNAME.github.io/premier-racing-info/`.

## Install it on iPhone
Open that link in Safari → Share → Add to Home Screen → Add. It opens full-screen with its own icon
and works offline.

## Keeping it updated
All race data lives inside index.html (look for `const RAW`, `STATS`, `SESSIONS`, `WINNERS`).
Edit and re-upload index.html, or let Claude's scheduled task commit updates to the repository.

Your stars and Going/Watched marks are saved on each phone.

## Favorites and reminders
- ★ (top right): follow drivers and teams. They get a card on the Weekend tab and a ★ in every table. Saved on the phone.
- 🔔 (top right): subscribe to a calendar per series. Every session with a published start time gets a
  30-minute alert. Calendars live in `calendar/` and are rebuilt with `node tools/build-ics.mjs`.

## Series directory

The **Series** tab lists racing series from around the world (open-wheel, sports cars and GT, stock and touring cars, rally and off-road, drag, drift and motorcycles). The data is in `world.js`: one entry per series with its 2026 champion or leader, next round, where to watch in the US and the official site. Series marked ★ In app have full calendars, times and results in the app.
