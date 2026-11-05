// Section-by-section health check for Premier Racing Info.
// Reads the data in index.html, world.js and news.json and lists what is out of date in each section,
// in the order we work through them (see SECTIONS.md). Nothing is changed except STATUS.md with --write.
// Run: node tools/check-site.mjs          (print the report)
//      node tools/check-site.mjs --write  (also save it to STATUS.md)
//      node tools/check-site.mjs 3        (only section 3, by number or name, e.g. "standings")
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const html = read("index.html");
const src = html.match(/<script>\n\/\/ ---------- Data ----------([\s\S]*?)<\/script>/)[1];
const data = new Function("window", "document", "localStorage",
  src.slice(0, src.indexOf("function esc")) + ";return {RAW,SESSIONS,SERIES_FULL,WINNERS,PODIUMS,STATS,MORE_STATS,WATCH,WORLD_TIMES};")({}, {}, {});
const grabObj = name => { const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`)); return m ? Function(`return (${m[1]})`)() : {}; };
const TICKETS = grabObj("TICKETS"), CIRCUIT_SITES = grabObj("CIRCUIT_SITES"), GEO = grabObj("GEO"), SERIES_TICKETS = grabObj("SERIES_TICKETS");
global.window = {}; eval(read("world.js"));
const WORLD = global.window.WORLD;
const { RAW, SESSIONS, SERIES_FULL, WINNERS, PODIUMS, STATS, MORE_STATS, WATCH, WORLD_TIMES } = data;

const APP_TO_WORLD = { f1: "f1", imsa: "imsa", wec: "wec", gtwc: "gtwc-america", gte: "gtwc-europe", gtas: "gtwc-asia", gtau: "gtwc-australia", psc: "porsche-supercup", pccna: "carrera-cup-na", mustang: "mustang-challenge", nascar: "nascar-cup", indy: "indycar", motogp: "motogp" };
const WORLD_TO_APP = Object.fromEntries(Object.entries(APP_TO_WORLD).map(([a, w]) => [w, a]));
const now = new Date(), today = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" })).toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysAgo = iso => Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(iso + "T12:00:00Z")) / 864e5);
const M3 = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
// First date range in text like "Monza · Nov 6–8" → [startISO, endISO], assuming the nearest sensible year
function dates(txt){
  const m = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b(?:\s*[–-]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* )?(\d{1,2})\b)?(?:,? (20\d\d))?/.exec(txt || "");
  if (!m) return null;
  const y = m[5] ? +m[5] : +today.slice(0, 4), m1 = M3.indexOf(m[1].toLowerCase()), m2 = m[3] ? M3.indexOf(m[3].toLowerCase()) : m1;
  const iso = (yy, mm, dd) => new Date(Date.UTC(yy, mm, dd)).toISOString().slice(0, 10);
  return [iso(y, m1, +m[2]), iso(m2 < m1 ? y + 1 : y, m2, +(m[4] || m[2]))];
}
const pastDates = txt => { const r = dates(txt); if (!r) return null; let [a, b] = r; if (b > addDays(today, 45)) { a = String(+a.slice(0, 4) - 1) + a.slice(4); b = String(+b.slice(0, 4) - 1) + b.slice(4); } return [a, b]; };

const EV = RAW.filter(r => r[8] !== "cancelled").map(([id, s, name, circuit, location, start, end]) => ({ id, s, name, circuit, location, start, end }));
const done = EV.filter(e => e.end < today), upcoming = EV.filter(e => e.end >= today);
const nm = e => `${e.name} (${SERIES_FULL[e.s] || e.s}, ${e.end})`;

// Each section: [number, title, what it covers, function returning { todo: [...], ok: [...] }]
const SECTIONS = [
  [1, "Calendar & race pages", "Race dates, session start times and per-session stream links (RAW, SESSIONS, SESSION_WATCH)", () => {
    const todo = [], ok = [];
    const soon = upcoming.filter(e => e.start <= addDays(today, 7));
    for (const e of soon) (SESSIONS[e.id] ? ok : todo).push(SESSIONS[e.id] ? `${nm(e)} has start times` : `No session start times yet: ${nm(e)}`);
    const nextWk = upcoming.filter(e => e.start > addDays(today, 7) && e.start <= addDays(today, 14) && !SESSIONS[e.id]);
    if (nextWk.length) todo.push(`Coming the week after, still without start times: ${nextWk.map(nm).join("; ")}`);
    for (const [app] of Object.entries(APP_TO_WORLD)) if (!EV.some(e => e.s === app && e.start.startsWith(String(+today.slice(0, 4) + 1)))) todo.push(`No ${+today.slice(0, 4) + 1} calendar yet for ${SERIES_FULL[app] || app}`);
    return { todo, ok };
  }],
  [2, "Results & picks", "Winners on race pages and the top three used to score picks (WINNERS, PODIUMS, RESULT_FOR)", () => {
    const todo = [], ok = [];
    const recent = done.filter(e => daysAgo(e.end) <= 21), older = done.filter(e => daysAgo(e.end) > 21 && !WINNERS[e.id]);
    for (const e of recent) WINNERS[e.id] ? ok.push(`Winner saved: ${nm(e)}`) : todo.push(`Missing winner (recent): ${nm(e)}`);
    if (older.length) todo.push(`Older races with no winner listed (${older.length}): ${older.map(e => e.id).join(", ")}`);
    const pickSeries = [...new Set(Object.keys(PODIUMS).map(id => (EV.find(e => e.id === id) || {}).s).filter(Boolean))];
    for (const s of pickSeries) {
      const first = EV.filter(e => PODIUMS[e.id] && e.s === s).map(e => e.end).sort()[0];
      for (const e of done.filter(e => e.s === s && e.end >= first)) PODIUMS[e.id] ? ok.push(`Picks scored: ${nm(e)}`) : todo.push(`Picks can't be scored, no top three: ${nm(e)}`);
    }
    return { todo, ok };
  }],
  [3, "Standings", "Last race, standings and notes for all 21 series (STATS, MORE_STATS)", () => {
    const todo = [], ok = [];
    const check = (key, st, app, w) => {
      const r = pastDates(st.race && st.race.where), label = (w && (w.short || w.name)) || SERIES_FULL[app] || key;
      if (!r) return todo.push(`${label}: can't read the date of the last race in the standings`);
      if (app) {
        const last = done.filter(e => e.s === app).sort((a, b) => a.end.localeCompare(b.end)).pop();
        if (last && last.end > addDays(r[1], 1)) return todo.push(`${label}: standings are after ${st.race.name} (${r[1]}), but ${last.name} finished ${last.end}`);
        return ok.push(`${label}: current (${st.race.name})`);
      }
      if (w && w.status !== "Finished" && daysAgo(r[1]) > 21) return todo.push(`${label}: last race in standings is ${st.race.name} (${r[1]}), ${daysAgo(r[1])} days ago — check for newer rounds`);
      ok.push(`${label}: last race ${st.race.name} (${r[1]})`);
    };
    for (const [k, st] of Object.entries(STATS)) check(k, st, k, WORLD.series.find(x => x.id === APP_TO_WORLD[k]));
    for (const [k, st] of Object.entries(MORE_STATS)) check(k, st, WORLD_TO_APP[k], WORLD.series.find(x => x.id === k));
    return { todo, ok };
  }],
  [4, "Series directory", `All ${WORLD.series.length} series: status, champion or leader, next round, season dates (world.js)`, () => {
    const todo = [], ok = [];
    const asof = new Date(WORLD.asof + " 12:00 UTC").toISOString().slice(0, 10);
    (daysAgo(asof) > 7 ? todo : ok).push(`Directory last researched ${WORLD.asof} (${daysAgo(asof)} days ago)`);
    for (const x of WORLD.series) {
      if (x.app || WORLD_TO_APP[x.id]) continue; // next round comes from the calendar
      const label = x.short || x.name;
      if (x.status === "Finished") { if (!x.champion) todo.push(`${label}: season finished but no champion listed`); continue; }
      const seasonEnd = (x.season || "").split(/[–-]/).pop();
      const se = /20\d\d/.test(seasonEnd) ? dates(seasonEnd) : null;
      const nx = x.next && dates(x.next);
      if (!x.status) todo.push(`${label}: no status (in progress or finished?)${x.next ? "" : " and no next round"}`);
      else if (se && se[1] < today && !(nx && nx[1] >= today)) todo.push(`${label}: season ended ${se[1]} but status is still "${x.status}"`);
      else if (!x.next) todo.push(`${label}: ${x.status}, no next round listed`);
      else { const n = dates(x.next); if (n && pastDates(x.next) && pastDates(x.next)[1] < today && n[1] < today) todo.push(`${label}: next round "${x.next}" has passed (hidden on the site)`); }
    }
    if (!todo.length) ok.push("Every series has a current status and next round");
    return { todo, ok };
  }],
  [5, "Watch", "Where to watch in the US, per series and per session (WATCH, world.js watch, WORLD_TIMES)", () => {
    const todo = [], ok = [];
    for (const app of Object.keys(APP_TO_WORLD)) (WATCH[app] && WATCH[app].length ? ok : todo).push(WATCH[app] && WATCH[app].length ? `${SERIES_FULL[app] || app}: ${WATCH[app].map(w => w[0]).join(", ")}` : `${SERIES_FULL[app] || app}: no watch links`);
    for (const x of WORLD.series) if (!x.app && !WORLD_TO_APP[x.id] && !(x.watch && x.watch.length)) todo.push(`${x.short || x.name}: no watch links in the directory`);
    const stale = Object.entries(WORLD_TIMES).filter(([, v]) => v.every(t => Date.parse(t[1]) < now - 864e5)).map(([k]) => k);
    if (stale.length) todo.push(`Old start times to clear from WORLD_TIMES: ${stale.join(", ")}`);
    const live = WORLD.series.filter(x => !x.app && x.status !== "Finished" && x.next && (() => { const r = dates(x.next); return r && r[0] <= addDays(today, 4) && r[1] >= today; })());
    for (const x of live) (WORLD_TIMES[x.id] ? ok : todo).push(WORLD_TIMES[x.id] ? `${x.short || x.name}: start time saved for this weekend` : `${x.short || x.name} races this weekend (${x.next}) with no start time`);
    return { todo, ok };
  }],
  [6, "Tickets", "Official ticket links per race and per series (TICKETS, SERIES_TICKETS, CIRCUIT_SITES)", () => {
    const todo = [], ok = [];
    const next60 = upcoming.filter(e => e.start <= addDays(today, 60));
    const weak = next60.filter(e => !TICKETS[e.id] && e.s !== "f1" && !CIRCUIT_SITES[e.circuit] && !EV.some(o => o.s === "f1" && o.circuit === e.circuit && o.start <= e.end && o.end >= e.start));
    for (const e of weak) todo.push(`Only a Google search for tickets: ${nm(e)}`);
    if (next60.length - weak.length) ok.push(`${next60.length - weak.length} of ${next60.length} races in the next 60 days have an official ticket or circuit link`);
    const old = Object.keys(TICKETS).filter(id => (EV.find(e => e.id === id) || { end: "9999" }).end < today);
    if (old.length) todo.push(`Ticket links for races that are over (safe to remove): ${old.join(", ")}`);
    const noSeries = WORLD.series.filter(x => !SERIES_TICKETS[x.id] && !x.site && x.status !== "Finished");
    for (const x of noSeries) todo.push(`${x.short || x.name}: no official ticket store or site`);
    return { todo, ok };
  }],
  [7, "Tracks & races near you", "Track pages and the state/country lists (GEO, CIRCUIT_SITES)", () => {
    const todo = [], ok = [];
    const places = GEO.places || {};
    const circuits = [...new Set(upcoming.map(e => e.circuit))];
    for (const c of circuits) if (!places[c]) todo.push(`No country/state for ${c}, so it's missing from "Races near you"`);
    for (const c of circuits) if (!CIRCUIT_SITES[c]) todo.push(`No circuit website for ${c}`);
    if (!todo.length) ok.push(`All ${circuits.length} upcoming circuits have a location and website`);
    return { todo, ok };
  }],
  [8, "News", "Headlines collected every 30 minutes (news.json, news.yml)", () => {
    const todo = [], ok = [];
    const n = JSON.parse(read("news.json")), age = (now - Date.parse(n.updated)) / 36e5;
    (age > 2 ? todo : ok).push(`News last collected ${age.toFixed(1)} hours ago (${(n.items || []).length} headlines)`);
    const week = (n.items || []).filter(i => now - Date.parse(i.time) < 7 * 864e5);
    for (const x of WORLD.series.filter(x => x.app || WORLD_TO_APP[x.id])) { const c = week.filter(i => (i.tags || []).includes(WORLD_TO_APP[x.id] || x.app || x.id) || (i.tags || []).includes(x.id)).length; if (!c && x.status !== "Finished") todo.push(`${x.short || x.name}: no headlines in the last 7 days`); }
    return { todo, ok };
  }],
  [9, "Search pages", "The ~530 generated pages, sitemap and the crawlable block in index.html (tools/build-pages.mjs, pages.yml)", () => {
    const todo = [], ok = [];
    const m = html.match(/Updated ([A-Z][a-z]+ \d+, 20\d\d)\.<\/p><\/div><!--\/seo-->/);
    const built = m ? new Date(m[1] + " 12:00 UTC").toISOString().slice(0, 10) : null;
    (!built || daysAgo(built) > 1 ? todo : ok).push(built ? `Pages last rebuilt ${m[1]}` : "Can't find the rebuild date in index.html");
    const sm = read("sitemap.xml"), urls = (sm.match(/<loc>/g) || []).length;
    ok.push(`${urls} pages in the sitemap`);
    return { todo, ok };
  }],
];
// Sections the script can't judge on its own; checked by hand, see SECTIONS.md
const MANUAL = [[10, "Photos"], [11, "Accounts, alerts & picks game"], [12, "Design & speed"], [13, "Legal pages"]];

const pick = process.argv.slice(2).find(a => !a.startsWith("--"));
const chosen = SECTIONS.filter(([n, t]) => !pick || String(n) === pick || t.toLowerCase().includes(pick.toLowerCase()));
let out = `# Site status\n\nChecked ${today} by \`node tools/check-site.mjs\`. Sections are in the order we work through them (see SECTIONS.md).\n\n`;
out += `| # | Section | To do |\n|---|---|---|\n`;
const results = chosen.map(s => [s, s[3]()]);
for (const [[n, t], r] of results) out += `| ${n} | ${t} | ${r.todo.length ? "⚠️ " + r.todo.length : "✅ 0"} |\n`;
if (!pick) for (const [n, t] of MANUAL) out += `| ${n} | ${t} | by hand |\n`;
for (const [[n, t, what], r] of results) {
  out += `\n## ${n}. ${t}\n_${what}_\n\n`;
  out += r.todo.length ? r.todo.map(x => `- [ ] ${x}`).join("\n") + "\n" : "- Nothing to do.\n";
  if (r.ok.length) out += `\n<details><summary>Up to date (${r.ok.length})</summary>\n\n${r.ok.map(x => `- ${x}`).join("\n")}\n\n</details>\n`;
}
console.log(out);
if (process.argv.includes("--write")) fs.writeFileSync(path.join(root, "STATUS.md"), out);
