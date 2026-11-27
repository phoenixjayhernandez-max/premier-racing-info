// Team profiles: /teams/ and /teams/<id>/ pages, built by tools/build-pages.mjs.
//
// Two kinds of profile:
//  - "unclaimed": FACTS ONLY (name, series, base, first season, official site). Facts aren't owned by
//    anyone, so these need no permission. No logos, no photos, no team-written text.
//  - "verified": the team claimed it through /teams/claim/ and we confirmed it came from the real team
//    (reply from their official email or a DM from their official account). Only then add their bio,
//    logo, photos, socials and support links, exactly as they sent them. The claim form's license
//    checkbox is the permission; keep the submission row in Supabase (team_claims) as the record.
//
// Fields:
//   id        url slug (lowercase-with-dashes)
//   name      team name as shown
//   series    world.js series ids the team races in (first one is the main series). For a series that
//             isn't in world.js (club racing, Lemons, karting), write its name instead, e.g. "SCCA Spec Miata"
//   country   where the team is based (country)
//   base      town/city of the main base
//   since     first season in that series; sinceNote adds context, e.g. "first as Toro Rosso"
//   site      official website (only if checked)
//   stats     how the team is written in STATS / MORE_STATS standings rows, so drivers + points show up
//   status    "unclaimed" | "verified"
//   checked   date the facts were last checked
// Verified only:
//   verified  date we confirmed the claim
//   bio       the team's own words (max ~600 characters)
//   logo      path to the logo file they sent, e.g. /teams/media/<id>/logo.png
//   photos    [[path, credit], ...] files they sent, credit exactly as they asked
//   socials   { instagram, tiktok, youtube, x, facebook } full URLs
//   support   { merch, sponsor, donate } full URLs: where fans can support the team
//   drivers   ["Name", ...] for teams not in our standings data
window.TEAMS = {"asof":"Nov 27, 2026","list":[
  {"id":"mclaren","name":"McLaren","series":["f1"],"country":"United Kingdom","base":"Woking","since":"1966","site":"https://www.mclaren.com/racing/","stats":"McLaren","status":"unclaimed","checked":"2026-11-27"},
  {"id":"ferrari","name":"Scuderia Ferrari","series":["f1"],"country":"Italy","base":"Maranello","since":"1950","site":"https://www.ferrari.com/en-EN/formula1","stats":"Ferrari","status":"unclaimed","checked":"2026-11-27"},
  {"id":"red-bull-racing","name":"Red Bull Racing","series":["f1"],"country":"United Kingdom","base":"Milton Keynes","since":"2005","site":"https://www.redbullracing.com/","stats":"Red Bull","status":"unclaimed","checked":"2026-11-27"},
  {"id":"mercedes","name":"Mercedes-AMG Petronas","series":["f1"],"country":"United Kingdom","base":"Brackley","since":"2010","sinceNote":"as the current works team","site":"https://www.mercedesamgf1.com/","stats":"Mercedes","status":"unclaimed","checked":"2026-11-27"},
  {"id":"aston-martin","name":"Aston Martin","series":["f1"],"country":"United Kingdom","base":"Silverstone","since":"2021","sinceNote":"under the Aston Martin name","site":"https://www.astonmartinf1.com/","stats":"Aston Martin","status":"unclaimed","checked":"2026-11-27"},
  {"id":"alpine","name":"Alpine","series":["f1"],"country":"United Kingdom","base":"Enstone","since":"2021","sinceNote":"under the Alpine name","stats":"Alpine","status":"unclaimed","checked":"2026-11-27"},
  {"id":"williams","name":"Williams","series":["f1"],"country":"United Kingdom","base":"Grove","since":"1977","site":"https://www.williamsf1.com/","stats":"Williams","status":"unclaimed","checked":"2026-11-27"},
  {"id":"racing-bulls","name":"Racing Bulls","series":["f1"],"country":"Italy","base":"Faenza","since":"2006","sinceNote":"first as Toro Rosso","stats":"Racing Bulls","status":"unclaimed","checked":"2026-11-27"},
  {"id":"haas","name":"Haas","series":["f1"],"country":"United States","base":"Kannapolis, North Carolina","since":"2016","site":"https://www.haasf1team.com/","stats":"Haas","status":"unclaimed","checked":"2026-11-27"},
  {"id":"audi","name":"Audi","series":["f1"],"country":"Switzerland","base":"Hinwil","since":"2026","sinceNote":"took over the Sauber team","stats":"Audi","status":"unclaimed","checked":"2026-11-27"},
  {"id":"cadillac","name":"Cadillac","series":["f1"],"country":"United States","base":"Fishers, Indiana (plus Silverstone, UK)","since":"2026","sinceNote":"new team","stats":"Cadillac","status":"unclaimed","checked":"2026-11-27"}
]};
