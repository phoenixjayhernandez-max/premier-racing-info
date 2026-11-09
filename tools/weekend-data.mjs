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

console.log(JSON.stringify({ fri, sun, races, also }, null, 1));
