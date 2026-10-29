// Sends lock-screen push notifications to phones that turned them on in the app.
// Run by GitHub Actions every 15 minutes (.github/workflows/push.yml). Needs the PUSH_SECRET repository secret.
//   Starting soon : a session of a followed series starts within 45 minutes
//   Live now      : a race (not practice/qualifying) has just started
//   Results       : a new winner, pole or session result was added to the app
//   Favorite news : a new headline names one of the person's favorite drivers or teams (off by default)
// Subscriptions and the sending key live in Supabase and are read through a function that checks PUSH_SECRET.
// push-state.json remembers what was already sent so nobody gets the same alert twice.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const grab = (re, what, fallback) => { const m = html.match(re); if (!m) { if (fallback !== undefined) return fallback; throw new Error("Couldn't find " + what); } return Function(`return (${m[1]})`)(); };
const RAW = grab(/const RAW = (\[[\s\S]*?\n\]);/, "RAW");
const SESSIONS = grab(/const SESSIONS = (\{[\s\S]*?\n\});/, "SESSIONS");
const FULL = grab(/const SERIES_FULL = (\{[^\n]*\});/, "SERIES_FULL");
const SHORT = grab(/const SERIES = (\{[^\n]*\});/, "SERIES");
const WINNERS = grab(/const WINNERS = (\{[\s\S]*?\n\});/, "WINNERS", {});
const WINNERS_LIVE = grab(/const WINNERS_LIVE = (\{[\s\S]*?\});/, "WINNERS_LIVE", {});
const SUPABASE_URL = process.env.SUPABASE_URL_TEST || grab(/const SUPABASE_URL = ("[^"]*");/, "SUPABASE_URL");
const SUPABASE_KEY = grab(/const SUPABASE_ANON_KEY = ("[^"]*");/, "SUPABASE_ANON_KEY");
const SITE = "https://phoenixjayhernandez-max.github.io/premier-racing-info/";
const SECRET = process.env.PUSH_SECRET;
const TEST = process.env.PUSH_TEST === "true";
if (!SECRET) { console.log("PUSH_SECRET isn't set yet. Add it in GitHub → Settings → Secrets and variables → Actions."); process.exit(0); }

const statePath = path.join(root, "push-state.json");
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : { sent: {} };
const now = process.env.PUSH_NOW ? Date.parse(process.env.PUSH_NOW) : Date.now(); // PUSH_NOW only for testing
const EV = Object.fromEntries(RAW.map(([id, s, name, circuit, loc, start, end, tags, status]) => [id, { id, s, name, circuit, status }]));

// ---- Work out what to announce ----
const alerts = []; // {key, type, series, title, body, url}
const isRace = t => /race|grand prix|\bhours?\b|feature|sprint(?! qualifying| shootout)/i.test(t) && !/practice|qualifying|shootout|warm/i.test(t);
for (const [id, list] of Object.entries(SESSIONS)) {
  const e = EV[id]; if (!e || e.status === "cancelled") continue;
  for (const [title, iso, support] of list) {
    if (support) continue;
    const t = Date.parse(iso), mins = Math.round((t - now) / 60000);
    if (mins > 0 && mins <= 45) alerts.push({ key: `soon:${id}:${title}`, type: "soon", series: e.s, title: `${SHORT[e.s] || e.s}: ${title} in ${mins} min`, body: `${e.name} · ${e.circuit}. Tap for times and where to watch.`, url: SITE + "#weekend" });
    if (isRace(title) && mins <= 0 && mins >= -25) alerts.push({ key: `live:${id}:${title}`, type: "live", series: e.s, title: `🟢 ${SHORT[e.s] || e.s} is live`, body: `${e.name}: ${title} has started. Tap to watch.`, url: SITE + "#weekend" });
  }
}
for (const [id, w] of Object.entries(WINNERS)) {
  const e = EV[id]; if (!e) continue;
  alerts.push({ key: `win:${id}`, type: "result", series: e.s, title: `🏁 ${SHORT[e.s] || e.s}: ${e.name}`, body: `Won by ${w}. Tap for the full results.`, url: SITE + "#standings" });
}
for (const [id, w] of Object.entries(WINNERS_LIVE)) {
  const e = EV[id]; if (!e || !w) continue;
  alerts.push({ key: `wl:${id}:${w}`, type: "result", series: e.s, title: `${SHORT[e.s] || e.s}: ${e.name}`, body: `${w}. Tap for the latest order.`, url: SITE + "#weekend" });
}
let news = [];
try { news = JSON.parse(fs.readFileSync(path.join(root, "news.json"), "utf8")).items || []; } catch (e) {}
news = news.filter(x => now - Date.parse(x.time) < 3 * 3600000);

// First run: remember everything that already exists so nobody gets a flood of old alerts.
if (!state.seeded) {
  for (const a of alerts) if (a.type === "result") state.sent[a.key] = new Date().toISOString();
  for (const x of news) state.sent["news:" + x.link] = new Date().toISOString();
  state.seeded = true;
}
const fresh = alerts.filter(a => !state.sent[a.key]);
const freshNews = news.filter(x => !state.sent["news:" + x.link]);

// ---- Load subscriptions ----
async function rpc(fn, body){
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${fn}: HTTP ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
// Keep prediction lock times in Supabase in sync with race start times (picks lock when the Grand Prix starts).
try {
  const locks = {};
  for (const [id, ser, name, circ, loc, start, end, tags, status] of RAW) {
    if (ser !== "f1" || status === "cancelled") continue;
    const gp = (SESSIONS[id] || []).find(x => /grand prix/i.test(x[0]) && !x[2]);
    const t = gp ? new Date(gp[1]) : new Date(end + "T12:00:00Z");
    if (t.getTime() > now) locks["f1:" + id] = t.toISOString();
  }
  const seasonRace = (html.match(/const SEASON_LOCK_RACE = "([^"]+)"/) || [])[1];
  if (seasonRace && locks["f1:" + seasonRace]) locks["f1:season"] = locks["f1:" + seasonRace];
  const n = await rpc("set_pick_locks", { p_secret: SECRET, p_locks: locks });
  state.lockSync = { at: new Date().toISOString(), result: n, races: Object.keys(locks).length };
  if (n === -1) console.log("Lock sync: secret not accepted");
} catch (e) { state.lockSync = { at: new Date().toISOString(), error: String(e.message).slice(0, 160) }; console.log("Lock sync skipped:", String(e.message).slice(0, 120)); }
if (!fresh.length && !freshNews.length && !TEST) { save(); console.log("Nothing new to send"); process.exit(0); }
const cfg = await rpc("get_push_config", { p_secret: SECRET });
if (!cfg || !cfg.vapid_private) { console.log("Supabase didn't return the push settings. Check that setup/push.sql was run and PUSH_SECRET matches."); process.exit(1); }
webpush.setVapidDetails("mailto:premier-racing-info@users.noreply.github.com", cfg.vapid_public, cfg.vapid_private);
const subs = cfg.subs || [];
console.log(`${subs.length} phones, ${fresh.length} new alerts, ${freshNews.length} new headlines`);

const gone = [];
let sentCount = 0, failCount = 0;
async function send(sub, payload){
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
    sentCount++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) gone.push(sub.endpoint);
    else { failCount++; state.lastError = String(e.statusCode || "") + " " + String(e.body || e.message || "").slice(0, 200); } console.log("Send failed:", e.statusCode || "", (e.body || e.message || "").toString().slice(0, 120));
  }
}
for (const sub of subs) {
  const p = sub.prefs || {};
  const types = Object.assign({ soon: true, live: true, result: true, news: false }, p.types || {});
  const series = Array.isArray(p.series) && p.series.length ? new Set(p.series) : null;
  const favNames = (p.favs || []).filter(n => n && n.length > 3);
  const out = [];
  if (TEST) out.push({ title: "Premier Racing Info", body: "Notifications are working. You'll get race alerts here.", url: SITE, tag: "test" });
  for (const a of fresh) if (types[a.type] && (!series || series.has(a.series))) out.push({ title: a.title, body: a.body, url: a.url, tag: a.key });
  if (types.news && favNames.length) {
    const hit = freshNews.find(x => favNames.some(n => x.title.includes(n)));
    if (hit) out.push({ title: `📰 ${hit.source}`, body: hit.title, url: hit.link, tag: "news:" + hit.link });
  }
  for (const pl of out.slice(0, 4)) await send(sub, pl);
}
for (const a of fresh) state.sent[a.key] = new Date().toISOString();
for (const x of freshNews) state.sent["news:" + x.link] = new Date().toISOString();
if (gone.length) await rpc("drop_push_subs", { p_secret: SECRET, p_endpoints: gone }).catch(e => console.log(e.message));
state.lastRun = { at: new Date().toISOString(), phones: subs.length, sent: sentCount, failed: failCount, expired: gone.length, test: TEST };
save();
console.log(`Sent ${sentCount} notifications; removed ${gone.length} expired phones`);

function save(){
  // forget entries older than 30 days
  for (const [k, t] of Object.entries(state.sent)) if (now - Date.parse(t) > 30 * 86400000) delete state.sent[k];
  fs.writeFileSync(statePath, JSON.stringify(state, null, 0));
}
