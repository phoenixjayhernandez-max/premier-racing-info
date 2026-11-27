// Prints the last race weekend's results as JSON for tools/make-results-post.py.
// The weekend is the Fri–Sun just finished (with Monday finishes): on Sun or Mon that's this one, otherwise the previous one.
// Run: node tools/results-data.mjs [YYYY-MM-DD]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const src = html.match(/<script>\n\/\/ ---------- Data ----------([\s\S]*?)<\/script>/)[1];
const { RAW, SERIES, SERIES_FULL, WINNERS, STATS, MORE_STATS } = new Function("window", "document", "localStorage",
  src.slice(0, src.indexOf("function esc")) + ";return {RAW,SERIES,SERIES_FULL,WINNERS,STATS,MORE_STATS};")({}, {}, {});
const APP_TO_WORLD = Function(`return (${html.match(/const APP_TO_WORLD = (\{[^\n]*\});/)[1]})`)();
global.window = {}; eval(fs.readFileSync(path.join(root, "world.js"), "utf8"));
const WORLD = Object.fromEntries(global.window.WORLD.series.map(s => [s.id, s]));

const TZ = "America/Chicago";
const COLORS = { f1: "#E8372E", imsa: "#3B7DE0", wec: "#14A883", gtwc: "#E2601F", gte: "#8B5CF6", gtas: "#E0408A", gtau: "#1AA0BC", psc: "#8A94A3", pccna: "#6E9A2C", mustang: "#C23B3B", nascar: "#E3A21A", indy: "#4F6FD8", motogp: "#C04BD0" };
const WCOLORS = ["#E2601F", "#14A883", "#C04BD0", "#3B7DE0", "#E3A21A"];
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const base = process.argv[2] || new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dow = new Date(base + "T12:00:00Z").getUTCDay();
const sun = dow === 0 ? base : dow === 1 ? addDays(base, -1) : addDays(base, -dow), fri = addDays(sun, -2), mon = addDays(sun, 1);
const SEASON = +sun.slice(0, 4);

function standing(st){
  if (!st) return "";
  if (st.champs && st.champs[0]) return `${st.champs[0][1]} is the ${SEASON} champion`;
  const a = st.standings && st.standings[0], b = st.standings && st.standings[1];
  if (!a) return "";
  const pa = +a[a.length - 1], pb = b ? +b[b.length - 1] : 0;
  return `${a[0]} leads${pa ? ` on ${pa.toLocaleString("en-US")} pts` : ""}${b && pa ? `, ${+(pa - pb).toFixed(1)} ahead` : ""}`;
}
const races = RAW.filter(r => r[8] !== "cancelled" && r[6] >= fri && r[6] <= mon).map(([id, s, name, circuit, location, start, end]) => ({
  id, s, series: SERIES[s], seriesFull: SERIES_FULL[s], color: COLORS[s] || "#2461E9", name, circuit, location,
  winner: WINNERS[id] || "", standing: standing(STATS[s]) || standing(MORE_STATS[APP_TO_WORLD[s]]),
  page: `https://premierracinginfo.com/races/${slug(`${SERIES[s]} ${name} ${start.slice(0, 4)}`)}/`,
}));
// Other series whose latest race (MORE_STATS) was this weekend: "Sandown · Nov 13–15"
const M = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const appWids = new Set(races.map(r => APP_TO_WORLD[r.s]));
let i = 0;
for (const [wid, st] of Object.entries(MORE_STATS)) {
  const r = st && st.race, m = r && /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/.exec(r.where || "");
  if (!m || appWids.has(wid)) continue;
  const d = `${sun.slice(0, 4)}-${String(M.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0")}-${String(m[3] || m[2]).padStart(2, "0")}`;
  if (d < fri || d > mon) continue;
  const w = WORLD[wid] || {}, first = String(r.note || "").split(/(?<=\.)\s/)[0].replace(/\.$/, "");
  races.push({ id: wid, s: wid, series: w.short || w.code || wid, seriesFull: w.name || wid, color: WCOLORS[i++ % WCOLORS.length],
    name: r.name.replace(/ \(.*\)$/, ""), circuit: String(r.where).split(" · ")[0], location: "", winner: first, standing: standing(st),
    page: `https://premierracinginfo.com/series/${wid}/` });
}
console.log(JSON.stringify({ fri, sun, races: races.filter(r => r.winner) }, null, 1));
