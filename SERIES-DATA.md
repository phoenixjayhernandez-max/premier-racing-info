# Series data files

Goal (Phoenix, Nov 27, 2026): every series page as close to F1's as the series allows — calendar, every result, full standings, entry list and news. The 13 app series already have this in index.html. The other 96 get it from one data file each: `data/series/<id>.json` (id = the series id in world.js).

The app loads the file when someone opens that series (Calendar, Standings and Drivers/Riders tabs, plus "Next round" and "Latest result" on Overview). build-pages.mjs adds the same sections to `/series/<id>/`. No file = the series shows its summary card as before, so files can be added one at a time.

## Tiers (`data/series/tiers.json`)
- **full** (45): calendar, every round's winner and results, full standings and entry list are published every season (series site, Wikipedia season article, results PDFs). Goal: one-to-one with F1.
- **partial** (44): calendar and champion are easy; standings and results only on the series site or timing service, often late or incomplete. Goal: calendar + winners + top-10 standings; more where it exists.
- **limited** (7): one-off events or sparse coverage (Pikes Peak, Baja/SCORE, Ultra4, Isle of Man TT, Lemons, Stadium Super Trucks, Drift Masters). Goal: event dates, class winners, entry list where published, news. Ask the organizers for the rest (see "Asking" below).

Work through the tiers in order: full first, then partial, then limited. `node tools/check-site.mjs` section 15 lists the next series without a file and files that have gone stale.

## Where the data comes from (in this order)
1. The series' own site: calendar, results, standings, entry list. Facts (dates, positions, points) are not copyrighted; don't copy their text or logos.
2. The Wikipedia season article ("2026 Super Formula Championship"): use for calendar, results and standings tables. Wikipedia is CC BY-SA 4.0, so the file's `sources` must list it with the licence; the app and pages show that credit under the tables.
3. Timing services (Al Kamel, TSL, MyLaps/Speedhive, Race Monitor) for results the series doesn't publish.
4. Trusted news (Motorsport.com, Autosport, RACER, Sportscar365, DirtFish, Speedway Digest…) for a winner when nothing official is out yet. Mark `"note": "unofficial"` until confirmed.

Never guess. A missing row is better than a wrong one.

## File format
```json
{
  "id": "superformula",
  "season": "2026",
  "updated": "2026-11-27",
  "sources": [["Super Formula official results", "https://superformula.net/sf3/en/race_results"],
              ["Wikipedia: 2026 Super Formula Championship", "https://en.wikipedia.org/wiki/2026_Super_Formula_Championship", "CC BY-SA 4.0"]],
  "calendar": [
    { "rd": "1", "name": "Suzuka", "circuit": "Suzuka Circuit", "location": "Suzuka, Japan", "start": "2026-04-04", "end": "2026-04-05",
      "winner": "Driver (Team)", "pole": "Driver", "note": "Race 1 of 2",
      "results": [{ "title": "Race", "rows": [["1", "64", "Driver Name", "Team · Car", "Time or gap"]] }] }
  ],
  "champions": [["Drivers", "Driver Name", "Team, 153 pts"]],
  "standingsNote": "After round 12 of 12 (final)",
  "standings": [{ "title": "Drivers", "rows": [["Driver Name", "Team", 153]] },
                { "title": "Teams", "rows": [["Team", 210]] }],
  "entriesTitle": "2026 drivers",
  "entries": [["64", "Driver Name", "Team", "Car / engine"]]
}
```
- Dates are local race dates, `YYYY-MM-DD`. Add `"cancelled": true` or `"provisional": true` where it applies.
- Two-race weekends: one calendar row per weekend, `winner` like "R1 Name · R2 Name", and one `results` block per race.
- `results` is optional (top 10 is fine); `winner` alone still shows.
- Standings rows: `[name, team, points]` for drivers, `[name, points]` for teams/makes. Top 10 minimum, full table when published.
- Next season's calendar goes in the same file once announced (rows with 2027 dates show as their own year).
- Bump `updated` every time you check it, even if nothing changed.

## Asking (limited-tier series and gaps)
Use contact@premierracinginfo.com. Ask the series' media/PR contact for: the season calendar, results after each event (PDF or link), final standings, and the entry list, plus permission to use their photos with credit. Template in OUTREACH.md ("Series data request"). Log who was asked and when in the series file as `"asked": [["2026-11-28", "media@series.com", "no reply yet"]]`.
