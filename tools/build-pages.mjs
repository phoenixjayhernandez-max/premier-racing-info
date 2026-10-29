// Builds search-friendly static pages from the app's data:
//   /races/<slug>/   one page per race (2026 + 2027): start times in Central time, how to watch, tickets, results
//   /series/<id>/    one page per series (all series in world.js)
//   /tracks/<slug>/  one page per circuit: races there, tickets
//   /watch/, /texas/, /tickets/, /calendar/ guides, plus sitemap.xml and robots.txt
// Run: node tools/build-pages.mjs  (GitHub Actions runs it automatically when index.html or world.js changes)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = "https://premierracinginfo.com";
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const src = html.match(/<script>\n\/\/ ---------- Data ----------([\s\S]*?)<\/script>/)[1];
const data = new Function("window", "document", "localStorage",
  src.slice(0, src.indexOf("function esc")) + ";return {RAW,SESSIONS,SERIES,SERIES_FULL,WINNERS,RESULT_FOR,STATS,WATCH,TRACKS,MAKERS,events};")({}, {}, {});
const grabObj = name => { const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`)); return m ? Function(`return (${m[1]})`)() : {}; };
const TICKETS = grabObj("TICKETS"), CIRCUIT_SITES = grabObj("CIRCUIT_SITES"), VENUE = grabObj("VENUE");
global.window = {}; eval(fs.readFileSync(path.join(root, "world.js"), "utf8"));
const WORLD = global.window.WORLD;
const { RAW, SESSIONS, SERIES, SERIES_FULL, WINNERS, RESULT_FOR, STATS, WATCH, TRACKS } = data;
const APP_TO_WORLD = { f1: "f1", imsa: "imsa", wec: "wec", gtwc: "gtwc-america", gte: "gtwc-europe", gtas: "gtwc-asia", gtau: "gtwc-australia", psc: "porsche-supercup", pccna: "carrera-cup-na", mustang: "mustang-challenge" };
const COLORS = { f1: "#D7261E", imsa: "#2563B8", wec: "#0F8A6C", gtwc: "#C2410C", gte: "#6D28D9", gtas: "#BE185D", gtau: "#0E7490", psc: "#4B5563", pccna: "#3F6212", mustang: "#7F1D1D" };

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const TZ = "America/Chicago";
const fDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
const fTime = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const d = s => new Date(s + "T12:00:00Z");
const range = (a, b) => { const s = d(a), e = d(b); if (a === b) return `${MON[s.getUTCMonth()]} ${s.getUTCDate()}, ${s.getUTCFullYear()}`;
  return s.getUTCMonth() === e.getUTCMonth() ? `${MON[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}, ${e.getUTCFullYear()}` : `${MON[s.getUTCMonth()]} ${s.getUTCDate()} – ${MON[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`; };
const today = new Date().toISOString().slice(0, 10);

// ---- Events ----
const EV = RAW.filter(r => r[8] !== "cancelled").map(([id, s, name, circuit, location, start, end, tags]) => {
  const year = start.slice(0, 4);
  return { id, s, name, circuit, location, start, end, tags: tags || [], year, slug: slug(`${SERIES[s]} ${name} ${year}`) };
});
const evById = Object.fromEntries(EV.map(e => [e.id, e]));
const trackSlug = c => slug(c);
function ticketLinks(e){
  const out = [];
  if (e.end < today) return out;
  if (TICKETS[e.id]) out.push(TICKETS[e.id]);
  if (e.s === "f1" || EV.some(o => o.s === "f1" && o.circuit === e.circuit && o.start <= e.end && o.end >= e.start)) out.push([e.s === "f1" ? "F1 official tickets" : "F1 weekend tickets", "https://tickets.formula1.com/en"]);
  else if (CIRCUIT_SITES[e.circuit]) out.push(["Circuit website", CIRCUIT_SITES[e.circuit]]);
  out.push(["Search tickets", "https://www.google.com/search?q=" + encodeURIComponent(`${SERIES_FULL[e.s]} ${e.name} ${e.circuit} ${e.year} tickets`)]);
  const seen = new Set(); return out.filter(t => !seen.has(t[1]) && seen.add(t[1]));
}

// ---- Page shell ----
const CSS = `:root{--bg:#E6E9ED;--panel:#fff;--ink:#0E1319;--sub:#576172;--rule:#D2D8DF;--sig:#FFD100}
@media (prefers-color-scheme:dark){:root{--bg:#0B0F14;--panel:#141A21;--ink:#EDF1F5;--sub:#97A3B4;--rule:#29323D}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Saira,"Segoe UI",system-ui,sans-serif;font-size:16px;line-height:1.5}
a{color:inherit}header{background:var(--bg);border-bottom:1px solid var(--rule)}.wrap{max-width:860px;margin:0 auto;padding:0 16px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px}.brand{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;font-size:1.3rem;text-transform:uppercase;text-decoration:none}
.brand span{color:var(--sub);font-weight:600}.cta{background:var(--sig);color:#111;font-weight:700;text-decoration:none;padding:8px 14px;border-radius:999px;white-space:nowrap;font-size:.9rem}
nav.crumbs{font-size:.85rem;color:var(--sub);padding:10px 0 0}nav.crumbs a{color:var(--sub)}
h1{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;font-size:clamp(1.8rem,6vw,2.6rem);line-height:1.05;text-transform:uppercase;margin:14px 0 6px}
h2{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;text-transform:uppercase;font-size:1.25rem;margin:0 0 8px}
.lede{color:var(--sub);margin:0 0 16px}.card{background:var(--panel);border:1px solid var(--rule);border-left:4px solid var(--c,var(--sig));border-radius:10px;padding:16px;margin:0 0 12px}
table{width:100%;border-collapse:collapse;font-size:.95rem}td,th{padding:7px 4px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}th{font-size:.75rem;text-transform:uppercase;color:var(--sub)}
td.r{text-align:right;white-space:nowrap;font-weight:600}.btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.btn{display:inline-block;padding:8px 12px;border-radius:8px;border:1px solid var(--rule);background:var(--bg);text-decoration:none;font-weight:600;font-size:.9rem}
.btn.p{background:var(--sig);color:#111;border-color:var(--sig)}ul.list{list-style:none;padding:0;margin:0}ul.list li{padding:8px 0;border-bottom:1px solid var(--rule)}ul.list li:last-child{border-bottom:0}
ul.list small{display:block;color:var(--sub)}.tag{display:inline-block;font-size:.72rem;font-weight:700;border:1px solid var(--rule);border-radius:4px;padding:0 5px;margin-left:4px;color:var(--sub)}
footer{color:var(--sub);font-size:.85rem;padding:24px 0 40px}footer a{margin-right:12px}.cols{columns:2 260px;column-gap:24px}`;
function page({ url, title, desc, h1, crumbs = [], body, color, jsonld, appLink = "/" }){
  const canon = SITE + url;
  const ld = [].concat(jsonld || []);
  ld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ name: "Premier Racing Info", item: SITE + "/" }].concat(crumbs).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })) });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Premier Racing Info"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE}/icons/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0E1319"><link rel="icon" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-180.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@700;800&family=Saira:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("")}</head>
<body style="${color ? `--c:${color}` : ""}"><header><div class="wrap top"><a class="brand" href="/">Premier Racing <span>Info</span></a><a class="cta" href="${esc(appLink)}">Open the app</a></div></header>
<main class="wrap">${crumbs.length ? `<nav class="crumbs"><a href="/">Home</a>${crumbs.map(c => ` › <a href="${esc(c.item.replace(SITE, ""))}">${esc(c.name)}</a>`).join("")}</nav>` : ""}<h1>${esc(h1)}</h1>${body}</main>
<footer class="wrap"><a href="/">App</a><a href="/calendar/">Race calendar</a><a href="/watch/">How to watch</a><a href="/tickets/">Tickets</a><a href="/texas/">Races in Texas</a><a href="/series/">All series</a><a href="/tracks/">Tracks</a><a href="/about/">About</a><a href="/privacy/">Privacy</a><p>All times US Central (Texas). Dates and TV deals can change; check the official sites. Premier Racing Info is an independent fan site.</p></footer></body></html>`;
}
const pages = [];
const write = (url, content) => { const dir = path.join(root, url); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), content); pages.push(url); };
const watchList = s => (WATCH[s] || []).map(w => `<a class="btn" href="${esc(w[1])}" rel="noopener">▶ ${esc(w[0])}${w[2] ? " (free)" : ""}</a>`).join("");
const raceLink = e => `<a href="/races/${e.slug}/">${esc(e.name)}</a>`;

// ---- Race pages ----
for (const e of EV) {
  const full = SERIES_FULL[e.s], sess = SESSIONS[e.id] || [], tr = TRACKS[e.circuit], past = e.end < today;
  const mainRace = sess.filter(x => !x[2]).slice(-1)[0];
  let body = `<p class="lede">${esc(full)} · ${esc(e.circuit)}, ${esc(e.location)} · ${range(e.start, e.end)}${e.tags.length ? " · " + e.tags.map(esc).join(", ") : ""}</p>`;
  if (sess.length) body += `<section class="card"><h2>Start times (Central / Texas time)</h2><table><tr><th>Session</th><th>Day</th><th style="text-align:right">Time</th></tr>${sess.map(x => `<tr><td>${esc(x[0])}${x[2] ? ' <span class="tag">support</span>' : ""}</td><td>${fDay.format(new Date(x[1]))}</td><td class="r">${fTime.format(new Date(x[1]))}</td></tr>`).join("")}</table></section>`;
  else if (!past) body += `<section class="card"><h2>Start times</h2><p>Session times are usually published about a week before the race. They'll show here in Central time as soon as they're out.</p></section>`;
  if (RESULT_FOR[e.id] && STATS[RESULT_FOR[e.id]]?.race?.rows) {
    const r = STATS[RESULT_FOR[e.id]].race;
    body += `<section class="card"><h2>Results</h2>${r.note ? `<p>${esc(r.note)}</p>` : ""}<table><tr><th>Pos</th><th>Driver</th><th>Team / car</th></tr>${r.rows.slice(0, 10).map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`).join("")}</table></section>`;
  } else if (WINNERS[e.id]) body += `<section class="card"><h2>Winner</h2><p>🏁 ${esc(WINNERS[e.id])}</p></section>`;
  body += `<section class="card"><h2>How to watch in the US</h2><div class="btns">${watchList(e.s)}</div></section>`;
  const tk = ticketLinks(e);
  if (tk.length) body += `<section class="card"><h2>Tickets</h2><div class="btns">${tk.map((t, i) => `<a class="btn${i === 0 ? " p" : ""}" href="${esc(t[1])}" rel="noopener">🎟 ${esc(t[0])}</a>`).join("")}</div></section>`;
  body += `<section class="card"><h2>The track</h2><p><a href="/tracks/${trackSlug(e.circuit)}/">${esc(e.circuit)}</a>, ${esc(e.location)}${tr ? ` · ${tr[0] ? tr[0].toFixed(2) + " km lap" : ""}${tr[1] ? ", " + tr[1] + " corners" : ""} · ${esc(tr[2])}. ${esc(tr[3])}.` : ""}</p></section>`;
  const same = EV.filter(o => o.circuit === e.circuit && o.id !== e.id && o.start <= e.end && o.end >= e.start);
  if (same.length) body += `<section class="card"><h2>Also racing this weekend</h2><ul class="list">${same.map(o => `<li>${raceLink(o)} <small>${esc(SERIES_FULL[o.s])}</small></li>`).join("")}</ul></section>`;
  body += `<p><a class="btn p" href="/?race=${e.id}">Open in the app for live updates, alerts and picks ›</a> <a class="btn" href="/series/${APP_TO_WORLD[e.s]}/">${esc(full)} calendar &amp; standings</a></p>`;
  const title = `${e.name} ${e.year}${e.s === "f1" ? "" : " – " + SERIES[e.s]}: Start Times (Central), How to Watch & Tickets`;
  const desc = `${full} ${e.name} ${e.year} at ${e.circuit}, ${range(e.start, e.end)}. ${mainRace ? `Race starts ${fDay.format(new Date(mainRace[1]))} at ${fTime.format(new Date(mainRace[1]))}. ` : ""}Session times in Texas time, how to watch in the US${tk.length ? ", tickets" : ""}${RESULT_FOR[e.id] || WINNERS[e.id] ? " and results" : ""}.`;
  const ld = { "@context": "https://schema.org", "@type": "SportsEvent", name: `${full} ${e.name} ${e.year}`, sport: "Motorsport",
    startDate: mainRace ? mainRace[1] : e.start, endDate: e.end, eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.circuit, address: e.location }, organizer: { "@type": "SportsOrganization", name: full }, url: SITE + `/races/${e.slug}/`, image: SITE + "/icons/og.png", description: desc };
  if (tk[0] && !/google\.com/.test(tk[0][1])) ld.offers = { "@type": "Offer", url: tk[0][1], availability: "https://schema.org/InStock" };
  write(`/races/${e.slug}/`, page({ url: `/races/${e.slug}/`, title, desc, h1: `${e.name} ${e.year}`, color: COLORS[e.s], jsonld: ld, appLink: `/?race=${e.id}`,
    crumbs: [{ name: full, item: SITE + `/series/${APP_TO_WORLD[e.s]}/` }, { name: `${e.name} ${e.year}`, item: SITE + `/races/${e.slug}/` }], body }));
}

// ---- Series pages ----
const appOf = Object.fromEntries(Object.entries(APP_TO_WORLD).map(([a, w]) => [w, a]));
for (const x of WORLD.series) {
  const app = appOf[x.id];
  const watch = app ? WATCH[app] : (x.watch || []);
  let body = `<p class="lede">${esc(x.discipline)} · ${esc(x.level || "")} · ${esc(x.region || "")}</p>`;
  if (x.about) body += `<p>${esc(x.about)}</p>`;
  body += `<section class="card"><h2>${new Date().getFullYear()} season</h2><table>${[["Status", x.status], ["Champion", x.champion], ["Leader", x.leader], ["Next round", x.next], ["Season", x.season], ["Rounds", x.rounds], [x.discipline.startsWith("Moto") ? "Bikes" : "Cars", x.cars]].filter(r => r[1] || r[1] === 0).map(r => `<tr><th style="width:30%">${r[0]}</th><td>${esc(r[1])}</td></tr>`).join("")}</table></section>`;
  if (app) {
    const st = STATS[app] || {};
    for (const yr of ["2026", "2027"]) {
      const list = EV.filter(e => e.s === app && e.year === yr);
      if (list.length) body += `<section class="card"><h2>${yr} calendar</h2><ul class="list">${list.map(e => `<li>${raceLink(e)} <small>${range(e.start, e.end)} · ${esc(e.circuit)}${WINNERS[e.id] ? " · 🏁 " + esc(WINNERS[e.id]) : ""}${e.tags.includes("Provisional") ? " · provisional" : ""}</small></li>`).join("")}</ul></section>`;
    }
    if (st.champs) body += `<section class="card"><h2>Champions</h2><ul class="list">${st.champs.map(c => `<li><b>${esc(c[1])}</b> <small>${esc(c[0])}${c[2] ? " · " + esc(c[2]) : ""}</small></li>`).join("")}</ul></section>`;
    if (st.standings && !(st.champs && /before/i.test(st.standingsTitle || ""))) body += `<section class="card"><h2>${esc(st.standingsTitle || "Standings")}</h2><table><tr><th>Pos</th><th>Name</th><th style="text-align:right">Pts</th></tr>${st.standings.slice(0, 10).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r[0])}${r.length > 2 ? `<br><small>${esc(r[1])}</small>` : ""}</td><td class="r">${r[r.length - 1]}</td></tr>`).join("")}</table></section>`;
    if (st.grid) body += `<section class="card"><h2>${esc(st.gridTitle && !/format/i.test(st.gridTitle) ? st.gridTitle : "Teams and drivers")}</h2><ul class="list">${st.grid.map(g => `<li><b>${esc(g[0])}</b> <small>${esc(g[1])} · ${esc(g[2])}</small></li>`).join("")}</ul></section>`;
  }
  if (watch.length) body += `<section class="card"><h2>How to watch in the US</h2><div class="btns">${watch.map(w => `<a class="btn" href="${esc(w[1])}" rel="noopener">▶ ${esc(w[0])}${w[2] ? " (free)" : ""}</a>`).join("")}</div></section>`;
  body += `<p>${x.site ? `<a class="btn" href="${esc(x.site)}" rel="noopener">Official site ↗</a> ` : ""}<a class="btn p" href="/?series=${esc(x.id)}">Open in the app ›</a></p>`;
  const name = x.name;
  const title = `${x.short && x.short.length < name.length ? x.short : name} ${app ? "2026–2027 Calendar, Standings" : "2026: Champion, Standings"} & How to Watch in the US`;
  const desc = `${name}: ${x.champion ? "2026 champion " + x.champion + ". " : x.leader ? "Leader " + x.leader + ". " : ""}${x.next ? "Next: " + x.next + ". " : ""}${app ? "Full calendar with start times in Central time, standings, " : ""}how to watch in the US and the official site.`;
  write(`/series/${x.id}/`, page({ url: `/series/${x.id}/`, title, desc: desc.slice(0, 300), h1: name, appLink: `/?series=${x.id}`, color: app ? COLORS[app] : undefined,
    crumbs: [{ name: "All series", item: SITE + "/series/" }, { name: x.short || name, item: SITE + `/series/${x.id}/` }], body,
    jsonld: { "@context": "https://schema.org", "@type": "SportsOrganization", name, sport: "Motorsport", url: x.site || SITE + `/series/${x.id}/` } }));
}
// Series index
{
  const groups = {};
  for (const x of WORLD.series) (groups[x.discipline] = groups[x.discipline] || []).push(x);
  const body = `<p class="lede">${WORLD.series.length} racing series from around the world: champions, leaders, next rounds and how to watch from the US.</p>` +
    Object.entries(groups).map(([g, l]) => `<section class="card"><h2>${esc(g)}</h2><ul class="list">${l.map(x => `<li><a href="/series/${x.id}/">${esc(x.name)}</a> <small>${esc(x.region || "")}${x.champion ? " · 🏆 " + esc(x.champion) : x.leader ? " · Leader: " + esc(x.leader) : ""}</small></li>`).join("")}</ul></section>`).join("");
  write("/series/", page({ url: "/series/", title: "Every Racing Series: Champions, Calendars & How to Watch (2026)", desc: `All ${WORLD.series.length} major racing series worldwide — F1, NASCAR, IndyCar, IMSA, WEC, MotoGP, WRC and more — with champions, standings and how to watch in the US.`, h1: "Every racing series", crumbs: [{ name: "All series", item: SITE + "/series/" }], body }));
}

// ---- Track pages ----
const circuits = [...new Set(EV.map(e => e.circuit))];
for (const c of circuits) {
  const list = EV.filter(e => e.circuit === c).sort((a, b) => a.start.localeCompare(b.start));
  const loc = list[0].location, tr = TRACKS[c], up = list.filter(e => e.end >= today);
  let body = `<p class="lede">${esc(loc)}${VENUE[c] && !loc.includes(VENUE[c][0]) && VENUE[c][0] !== "USA" ? ", " + esc(VENUE[c][0]) : ""}${tr ? ` · ${tr[0] ? tr[0].toFixed(2) + " km (" + (tr[0] * 0.621371).toFixed(2) + " mi)" : ""}${tr[1] ? ", " + tr[1] + " corners" : ""} · ${esc(tr[2])}` : ""}</p>`;
  if (tr && tr[3]) body += `<p>${esc(tr[3])}.</p>`;
  if (up.length) body += `<section class="card"><h2>Upcoming races</h2><ul class="list">${up.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${range(e.start, e.end)}${e.tags.includes("Provisional") ? " · provisional" : ""}</small></li>`).join("")}</ul></section>`;
  const past = list.filter(e => e.end < today);
  if (past.length) body += `<section class="card"><h2>Earlier in 2026</h2><ul class="list">${past.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${range(e.start, e.end)}${WINNERS[e.id] ? " · 🏁 " + esc(WINNERS[e.id]) : ""}</small></li>`).join("")}</ul></section>`;
  const tk = up[0] ? ticketLinks(up[0]) : [];
  if (tk.length) body += `<section class="card"><h2>Tickets</h2><div class="btns">${tk.map((t, i) => `<a class="btn${i === 0 ? " p" : ""}" href="${esc(t[1])}" rel="noopener">🎟 ${esc(t[0])}</a>`).join("")}</div></section>`;
  const sl = trackSlug(c), yrs = [...new Set(list.map(e => e.year))].join("–");
  write(`/tracks/${sl}/`, page({ url: `/tracks/${sl}/`, title: `${c} Race Schedule ${yrs}: Every Race, Dates & Tickets`, desc: `All races at ${c} (${loc}) in ${yrs}: ${[...new Set(list.map(e => SERIES_FULL[e.s]))].join(", ")}. Dates, start times in Central time and tickets.`,
    h1: c, crumbs: [{ name: "Tracks", item: SITE + "/tracks/" }, { name: c, item: SITE + `/tracks/${sl}/` }], body,
    jsonld: { "@context": "https://schema.org", "@type": "StadiumOrArena", name: c, address: loc } }));
}
write("/tracks/", page({ url: "/tracks/", title: "Race Tracks: Every Circuit with Races in 2026 and 2027", desc: `${circuits.length} circuits and what races there in 2026 and 2027, with dates and tickets.`, h1: "Race tracks",
  crumbs: [{ name: "Tracks", item: SITE + "/tracks/" }], body: `<section class="card"><ul class="list cols">${circuits.sort().map(c => `<li><a href="/tracks/${trackSlug(c)}/">${esc(c)}</a> <small>${esc(EV.find(e => e.circuit === c).location)}</small></li>`).join("")}</ul></section>` }));

// ---- Guides ----
const byMonth = list => { const g = {}; for (const e of list) { const k = e.start.slice(0, 7); (g[k] = g[k] || []).push(e); } return g; };
const monthLabel = k => `${MONTHS[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
{ // calendar
  const up = EV.filter(e => e.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const body = `<p class="lede">Every upcoming race for F1, IMSA, WEC, GT World Challenge, the Porsche cups and Mustang Challenge — ${up.length} races through 2027.</p>` +
    Object.entries(byMonth(up)).map(([k, l]) => `<section class="card"><h2>${monthLabel(k)}</h2><ul class="list">${l.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${esc(e.circuit)} · ${range(e.start, e.end)}</small></li>`).join("")}</ul></section>`).join("");
  write("/calendar/", page({ url: "/calendar/", title: "Racing Calendar 2026–2027: F1, IMSA, WEC & GT Race Dates", desc: `${up.length} upcoming races: F1, IMSA, WEC, GT World Challenge, Porsche Supercup, Carrera Cup NA and Mustang Challenge, with dates and start times in Central time.`, h1: "Racing calendar", crumbs: [{ name: "Calendar", item: SITE + "/calendar/" }], body }));
}
{ // Texas
  const tx = EV.filter(e => /, TX$/.test(e.location) && e.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const body = `<p class="lede">Every upcoming race in Texas — all at Circuit of the Americas in Austin — with dates and tickets.</p><section class="card"><ul class="list">${tx.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${range(e.start, e.end)}</small></li>`).join("")}</ul></section>
  <p><a class="btn" href="/tracks/${trackSlug("Circuit of the Americas")}/">Circuit of the Americas schedule</a></p>`;
  write("/texas/", page({ url: "/texas/", title: "Races in Texas 2026–2027: COTA Race Schedule & Tickets", desc: `Upcoming races in Texas: ${[...new Set(tx.map(e => SERIES_FULL[e.s]))].join(", ")} at Circuit of the Americas in Austin. Dates and tickets.`, h1: "Races in Texas", crumbs: [{ name: "Races in Texas", item: SITE + "/texas/" }], body }));
}
{ // How to watch
  const rows = WORLD.series.map(x => { const app = appOf[x.id]; const w = app ? WATCH[app] : (x.watch || []); return [x, w.filter(v => v[0] !== "Official site")]; });
  const body = `<p class="lede">Where to stream or watch every major racing series in the United States, with free options marked.</p><section class="card"><table><tr><th>Series</th><th>Watch in the US</th></tr>${rows.map(([x, w]) => `<tr><td><a href="/series/${x.id}/">${esc(x.short || x.name)}</a></td><td>${w.map(v => `<a href="${esc(v[1])}" rel="noopener">${esc(v[0])}</a>${v[2] ? " (free)" : ""}`).join(", ") || esc(x.watch_us || "")}</td></tr>`).join("")}</table></section>`;
  write("/watch/", page({ url: "/watch/", title: "How to Watch Racing in the US (2026): F1, NASCAR, IndyCar, MotoGP, IMSA & More", desc: "Where to watch every racing series in the US: F1, NASCAR, IndyCar, MotoGP, IMSA, WEC, WRC, Supercross and more, including free streams.", h1: "How to watch racing in the US", crumbs: [{ name: "How to watch", item: SITE + "/watch/" }], body }));
}
{ // Tickets
  const up = EV.filter(e => e.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const body = `<p class="lede">Ticket links for every upcoming race: the official seller first, then the circuit and a ticket search.</p>` +
    Object.entries(byMonth(up)).map(([k, l]) => `<section class="card"><h2>${monthLabel(k)}</h2><ul class="list">${l.map(e => { const t = ticketLinks(e)[0]; return `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${esc(e.circuit)} · ${range(e.start, e.end)}${t ? ` · <a href="${esc(t[1])}" rel="noopener">🎟 ${esc(t[0])}</a>` : ""}</small></li>`; }).join("")}</ul></section>`).join("");
  write("/tickets/", page({ url: "/tickets/", title: "Race Tickets 2026–2027: F1, IMSA, WEC & GT Races", desc: "Where to buy tickets for every upcoming F1, IMSA, WEC, GT World Challenge, Porsche Cup and Mustang Challenge race, from the official sellers.", h1: "Race tickets", crumbs: [{ name: "Tickets", item: SITE + "/tickets/" }], body }));
}

// ---- About, Privacy, 404 ----
const CONTACT = "contact@premierracinginfo.com";
write("/about/", page({ url: "/about/", title: "About Premier Racing Info", desc: "Premier Racing Info is a free, independent fan site and app for following racing: start times in your time zone, how to watch, tickets, standings, alerts and a picks game.", h1: "About", crumbs: [{ name: "About", item: SITE + "/about/" }],
  body: `<section class="card"><p>Premier Racing Info started as a way for a few friends in San Antonio, Texas to keep up with F1, IMSA and WEC race weekends without doing time-zone math. It grew into a free app and site covering ${WORLD.series.length} racing series worldwide.</p>
  <p>What you get: start times in your own time zone, where to watch in the US, ticket links, results and standings, lock-screen alerts, news, and a season-long picks game to play with friends.</p>
  <p>It's an independent fan project and isn't affiliated with any series, team, circuit or broadcaster. Series and team names belong to their owners. Results and dates are checked against official sources but can change, so confirm with the official site before you travel.</p>
  <p>Questions, corrections or ideas: <a href="mailto:${CONTACT}">${CONTACT}</a></p></section><p><a class="btn p" href="/">Open the app ›</a></p>` }));
write("/privacy/", page({ url: "/privacy/", title: "Privacy Policy – Premier Racing Info", desc: "What Premier Racing Info stores, why, and how to delete it.", h1: "Privacy policy", crumbs: [{ name: "Privacy", item: SITE + "/privacy/" }],
  body: `<section class="card"><p><b>Last updated:</b> ${today}</p>
  <h2>What we store</h2><ul>
  <li><b>On your device:</b> your favorites, starred series, races marked Going/Watched, time zone and settings, saved in your browser so the app remembers them.</li>
  <li><b>If you create an account:</b> your email address, display name, those same preferences, and your prediction picks. Picks and display names are visible to other signed-in players on the leaderboard.</li>
  <li><b>If you turn on alerts:</b> a push address from your browser and which series and alert types you chose, so we can send notifications. Turning alerts off deletes it.</li></ul>
  <h2>What we don't do</h2><p>We don't sell your data, and there's no advertising tracking. We don't ask for your location; times use your phone's time zone setting.</p>
  <h2>Services we use</h2><p>Hosting by GitHub Pages; accounts, picks and alert settings stored with Supabase; fonts from Google Fonts; some photos loaded from Wikipedia; news headlines link to the original publishers. Links to tickets, streaming services and official sites take you to those companies' sites, which have their own policies.${""}</p>
  <h2>Your choices</h2><p>You can sign out, turn alerts off, or clear the app's data in your browser at any time. To delete your account and everything linked to it, email <a href="mailto:${CONTACT}">${CONTACT}</a> from the address you signed up with.</p>
  <h2>Changes</h2><p>If this policy changes, the date above will change too.</p></section>` }));
fs.writeFileSync(path.join(root, "404.html"), page({ url: "/404.html", title: "Page not found – Premier Racing Info", desc: "This page doesn't exist.", h1: "Page not found",
  body: `<section class="card"><p>That page doesn't exist, or the race may have moved. Try one of these:</p><div class="btns"><a class="btn p" href="/">Open the app</a><a class="btn" href="/calendar/">Race calendar</a><a class="btn" href="/series/">All series</a><a class="btn" href="/tickets/">Tickets</a></div></section>` }).replace('<link rel="canonical" href="https://premierracinginfo.com/404.html">', '<meta name="robots" content="noindex">'));

// ---- Sitemap & robots ----
const all = ["/"].concat(pages);
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
// Remove pages for races/series/tracks that no longer exist
for (const dir of ["races", "series", "tracks"]) {
  const base = path.join(root, dir); if (!fs.existsSync(base)) continue;
  for (const sub of fs.readdirSync(base)) { const url = `/${dir}/${sub}/`; if (fs.statSync(path.join(base, sub)).isDirectory() && !pages.includes(url)) fs.rmSync(path.join(base, sub), { recursive: true }); }
}
console.log(`Pages written: ${pages.length} (+ sitemap.xml, robots.txt)`);
