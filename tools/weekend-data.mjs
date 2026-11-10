// Prints this race weekend's data as JSON for tools/make-weekend-post.py.
// The weekend is Fri–Sun: the current one if today is Fri, Sat or Sun, otherwise the next one.
// Run: node tools/weekend-data.mjs [YYYY-MM-DD]   (any date inside or before the weekend you want)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const src = html.match(/<script>\n\/\/ ---------- Data ----------([\s\S]*?)<\/script>/)[1];
const { RAW, SESSIONS, SERIES, SERIES_FULL, WATCH } = new Function("window", "document", "localStorage",
  src.slice(0, src.indexOf("function esc")) + ";return {RAW,SESSIONS,SERIES,SERIES_FULL,WATCH};")({}, {}, {});
const grabObj = name => { const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`)); return m ? Function(`return (${m[1]})`)() : {}; };
const SESSION_WATCH = grabObj("SESSION_WATCH"), WORLD_TIMES = grabObj("WORLD_TIMES");
global.window = {}; eval(fs.readFileSync(path.join(root, "world.js"), "utf8"));
const WORLD = Object.fromEntries(global.window.WORLD.series.map(s => [s.id, s]));

const TZ = "America/Chicago";
const COLORS = { f1: "#E8372E", imsa: "#3B7DE0", wec: "#14A883", gtwc: "#E2601F", gte: "#8B5CF6", gtas: "#E0408A", gtau: "#1AA0BC", psc: "#8A94A3", pccna: "#6E9A2C", mustang: "#C23B3B", nascar: "#E3A21A", indy: "#4F6FD8", motogp: "#C04BD0" };
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ymd = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

// Pick the weekend (in Central time)
const base = process.argv[2] || new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dow = new Date(base + "T12:00:00Z").getUTCDay(); // 0 Sun … 6 Sat
const fri = dow === 5 ? base : dow === 6 ? addDays(base, -1) : dow === 0 ? addDays(base, -2) : addDays(base, 5 - dow);
const sun = addDays(fri, 2);

const fDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const fTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const fCt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const when = iso => { const t = new Date(iso); return { day: fDay.format(t), time: fTime.format(t).replace(":00", "").replace(" ", " "), date: fCt.format(t) }; };

const races = RAW.filter(r => r[8] !== "cancelled" && r[5] <= sun && r[6] >= fri).map(([id, s, name, circuit, location, start, end, tags]) => {
  const sessions = (SESSIONS[id] || []).map(([label, iso]) => ({ label, iso, ...when(iso) }));
  const main = sessions[sessions.length - 1] || null;
  const watch = (main && SESSION_WATCH[`${id}|${main.label}`]?.[0]) || WATCH[s]?.[0]?.[0] || "";
  return { id, s, series: SERIES[s], seriesFull: SERIES_FULL[s], color: COLORS[s] || "#2461E9", name, circuit, location, start, end,
    tags: tags || [], sessions, main, watch, page: `https://premierracinginfo.com/races/${slug(`${SERIES[s]} ${name} ${start.slice(0, 4)}`)}/` };
}).sort((a, b) => (a.main?.iso || a.start + "T23:59Z").localeCompare(b.main?.iso || b.start + "T23:59Z"));

// Untracked series with races this weekend (shown as "Also racing")
const also = Object.entries(WORLD_TIMES).filter(([, list]) => list.some(([, iso]) => { const d = fCt.format(new Date(iso)); return d >= fri && d <= sun; }))
  .map(([id]) => WORLD[id]?.short || WORLD[id]?.code || id);

// The same "also racing" series as full rows, used for the post when no tracked series races that weekend.
const WCOLORS = ["#E2601F", "#14A883", "#C04BD0", "#3B7DE0", "#E3A21A"];
const isRaceLabel = l => /race|elimination|start|feature|final/i.test(l) && !/show|qualif|practice/i.test(l);
const world = Object.entries(WORLD_TIMES).map(([id, list], i) => {
  const w = WORLD[id] || {}, inWk = (list || []).filter(([, iso]) => { const d = fCt.format(new Date(iso)); return d >= fri && d <= sun; });
  if (!inWk.length) return null;
  const sessions = inWk.map(([label, iso, wl]) => ({ label, iso, watchLabel: wl || "", ...when(iso) })).sort((x, y) => x.iso.localeCompare(y.iso));
  const mains = sessions.filter(x => isRaceLabel(x.label)), main = mains[mains.length - 1] || sessions[sessions.length - 1];
  let head = String(w.next || w.name || id).split(" · ")[0], paren = (head.match(/\(([^)]*)\)/) || [])[1] || "";
  head = head.replace(/\s*\([^)]*\)/g, "").trim();
  const [name, ...rest] = head.split(", ");
  const circuit = rest.join(", ") || (/finale/i.test(paren) ? "" : paren) || w.region || "";
  const watch = main.watchLabel || (w.watch && w.watch[0] && w.watch[0][0]) || "";
  return { id, s: id, series: w.short || w.code || id, seriesFull: w.name || id, color: WCOLORS[i % WCOLORS.length], name, circuit,
    location: w.region || "", start: fri, end: sun, tags: /finale/i.test(paren) ? ["Season finale"] : [], sessions, main, watch, page: `https://premierracinginfo.com/series/${id}/`, world: true };
}).filter(Boolean).sort((a, b) => a.main.iso.localeCompare(b.main.iso));

console.log(JSON.stringify({ fri, sun, races, also, world }, null, 1));
