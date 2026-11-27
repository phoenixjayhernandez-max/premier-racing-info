// Builds search-friendly static pages from the app's data:
//   /races/<slug>/   one page per race (2026 + 2027): start times in Central time, how to watch, tickets, results
//   /series/<id>/    one page per series (all series in world.js)
//   /tracks/<slug>/  one page per circuit: races there, tickets
//   /watch/, /texas/, /tickets/, /calendar/ guides, plus sitemap.xml and robots.txt
// Run: node tools/build-pages.mjs  (GitHub Actions runs it automatically when index.html or world.js changes)
import { TRACK_GUIDES } from "./track-guides.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markSVG } from "./logo.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = "https://premierracinginfo.com";
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const src = html.match(/<script>\n\/\/ ---------- Data ----------([\s\S]*?)<\/script>/)[1];
const data = new Function("window", "document", "localStorage",
  src.slice(0, src.indexOf("function esc")) + "; return {HIGHLIGHTS,ESPORTS,AFFILIATE,AFF_NOTE,affLink,ticketSearch,relOf,RAW,SESSIONS,SERIES,SERIES_FULL,WINNERS,RESULT_FOR,STATS,WATCH,TRACKS,MAKERS,events};")({}, {}, {});
const grabObj = name => { const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`)); return m ? Function(`return (${m[1]})`)() : {}; };
const MORE_STATS = grabObj("MORE_STATS"), MORE_KEY = { nascar: "nascar-cup", indy: "indycar", motogp: "motogp" };
const statsOf = app => STATS[app] || MORE_STATS[MORE_KEY[app]] || null;
const SESSION_WATCH = grabObj("SESSION_WATCH"), TICKETS = grabObj("TICKETS"), CIRCUIT_SITES = grabObj("CIRCUIT_SITES"), GEO = grabObj("GEO");
global.window = {}; eval(fs.readFileSync(path.join(root, "world.js"), "utf8"));
const WORLD = global.window.WORLD;
eval(fs.readFileSync(path.join(root, "teams.js"), "utf8"));
const { AFFILIATE, AFF_NOTE, affLink, ticketSearch, relOf } = data;
const { RAW, SESSIONS, SERIES, SERIES_FULL, WINNERS, RESULT_FOR, STATS, WATCH, TRACKS, HIGHLIGHTS } = data;
const APP_TO_WORLD = { f1: "f1", imsa: "imsa", wec: "wec", gtwc: "gtwc-america", gte: "gtwc-europe", gtas: "gtwc-asia", gtau: "gtwc-australia", psc: "porsche-supercup", pccna: "carrera-cup-na", mustang: "mustang-challenge", nascar: "nascar-cup", indy: "indycar", motogp: "motogp" };
const COLORS = { f1: "#D7261E", imsa: "#2563B8", wec: "#0F8A6C", gtwc: "#C2410C", gte: "#6D28D9", gtas: "#BE185D", gtau: "#0E7490", psc: "#4B5563", pccna: "#3F6212", mustang: "#7F1D1D" , nascar: "#A16207", indy: "#1E3A8A", motogp: "#86198F" };

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
  out.push(ticketSearch(`${SERIES_FULL[e.s]} ${e.name} ${e.circuit} ${e.year} tickets`));
  const hotel = affLink("hotels", e.location);
  if (hotel) out.push(["Hotels near the track · affiliate", hotel, "aff"]);
  const seen = new Set(); return out.filter(t => !seen.has(t[1]) && seen.add(t[1]));
}

// ---- Page shell ----
const LOGO = markSVG({ ink: "var(--ink)", stripe: "var(--sig)", id: "priCut" });
const CSS = `@font-face{font-family:"Archivo Logo";font-style:normal;font-weight:100 900;font-stretch:62% 125%;font-display:swap;src:url(/fonts/archivo-logo-normal.woff2) format("woff2")}@font-face{font-family:"Archivo Logo";font-style:italic;font-weight:100 900;font-stretch:62% 125%;font-display:swap;src:url(/fonts/archivo-logo-italic.woff2) format("woff2")}@font-face{font-family:"Albert Sans";font-weight:400;font-display:swap;src:url(/fonts/albert-sans-latin-400-normal.woff2) format("woff2")}@font-face{font-family:"Albert Sans";font-weight:600;font-display:swap;src:url(/fonts/albert-sans-latin-600-normal.woff2) format("woff2")}@font-face{font-family:"Saira Condensed";font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/saira-condensed-latin-600-normal.woff2) format("woff2")}@font-face{font-family:"Saira Condensed";font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/saira-condensed-latin-700-normal.woff2) format("woff2")}@font-face{font-family:"Saira Condensed";font-style:normal;font-weight:800;font-display:swap;src:url(/fonts/saira-condensed-latin-800-normal.woff2) format("woff2")}:root{--bg:oklch(98% 0.005 250);--panel:oklch(98% 0.005 250);--panel2:oklch(95% 0.006 250);--ink:oklch(16% 0.080 260);--sub:oklch(50% 0.020 250);--rule:oklch(78% 0.008 250);--sig:oklch(54% 0.215 263);color-scheme:light}:root[data-theme="dark"]{--bg:oklch(17% 0.030 258);--panel:oklch(17% 0.030 258);--panel2:oklch(22% 0.030 258);--ink:oklch(95% 0.008 250);--sub:oklch(71% 0.020 250);--rule:oklch(33% 0.030 255);--sig:oklch(70% 0.150 263);color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Albert Sans",system-ui,sans-serif;font-size:16px;line-height:1.5}
a{color:inherit}header{background:var(--bg);border-bottom:2px solid var(--ink)}.wrap{max-width:860px;margin:0 auto;padding:0 16px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px}.brand{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;font-size:1.3rem;text-transform:uppercase;text-decoration:none}
.brand{display:flex;align-items:center;gap:10px;min-width:0}.brand svg{height:24px;width:auto;flex:none;display:block}.brand .lw{display:flex;flex-direction:column;gap:2px;padding-left:10px;border-left:1px solid var(--rule);line-height:1;white-space:nowrap}.brand .lw1{font-family:"Archivo Logo",system-ui,sans-serif;font-stretch:125%;font-weight:700;font-size:12px;letter-spacing:.4em;margin-right:-.4em;text-transform:none}.brand .lw2{font-family:"Archivo Logo",system-ui,sans-serif;font-style:italic;font-stretch:78%;font-weight:900;font-size:13.5px;color:var(--sig)}@media (max-width:380px){.brand .lw{display:none}}.cta{background:var(--sig);color:#fff;border-radius:4px;font-weight:700;text-decoration:none;padding:8px 14px;border-radius:999px;white-space:nowrap;font-size:.9rem}
nav.crumbs{font-size:.85rem;color:var(--sub);padding:10px 0 0}nav.crumbs a{color:var(--sub)}
h1{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;text-transform:uppercase;font-size:clamp(1.8rem,6vw,2.6rem);line-height:1.05;margin:14px 0 6px}
h2{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;text-transform:uppercase;font-size:1.3rem;margin:0 0 8px}
.lede{color:var(--sub);margin:0 0 16px}.vid{position:relative;aspect-ratio:16/9;border-radius:6px;overflow:hidden;background:#000;margin:0 0 8px}.vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.guide h3{font-size:1rem;margin:16px 0 6px}ul.tips{margin:0;padding-left:20px}ul.tips li{margin:0 0 6px}.card{background:transparent;border:0;border-top:2px solid var(--ink);border-radius:0;padding:16px 0 24px;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:.95rem}td,th{padding:7px 4px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}th{font-size:.8rem;font-weight:600;color:var(--sub)}
td.r{text-align:right;white-space:nowrap;font-weight:600}.btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.btn{display:inline-block;padding:8px 12px;border-radius:6px;border:1px solid var(--rule);background:var(--panel2);text-decoration:none;font-weight:600;font-size:.9rem}
.btn.p{background:var(--ink);color:var(--bg);border-color:var(--ink)}ul.list{list-style:none;padding:0;margin:0}ul.list li{padding:8px 0;border-bottom:1px solid var(--rule)}ul.list li:last-child{border-bottom:0}
ul.list small{display:block;color:var(--sub)}.tag{display:inline-block;font-size:.75rem;font-weight:600;border:1px solid var(--rule);border-radius:4px;padding:0 5px;margin-left:4px;color:var(--sub)}
footer{color:var(--sub);font-size:.85rem;padding:24px 0 40px}footer a{margin-right:14px;text-decoration:none}td.r{font-family:"Saira Condensed",system-ui,sans-serif;font-size:1.05rem;font-variant-numeric:tabular-nums}.cols{columns:2 260px;column-gap:24px}
.answer{font-size:1.08rem;line-height:1.55;border-left:4px solid var(--sig);padding:4px 0 4px 14px;margin:0 0 20px}.faq h3{font-size:1.02rem;margin:16px 0 4px}.faq p{margin:0 0 6px}.updated{color:var(--sub);font-size:.85rem;margin:24px 0 0}
.ph-hero{position:relative;min-height:clamp(260px,42svh,400px);display:flex;align-items:flex-end;background:#0B1424;color:#F7F9FB;overflow:hidden;isolation:isolate}
.ph-hero::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(8,14,26,.82) 0%,rgba(8,14,26,.5) 55%,rgba(8,14,26,.2) 100%),linear-gradient(to top,rgba(8,14,26,.75),transparent 55%)}
.ph-media{position:absolute;inset:-10% 0;z-index:-2;will-change:transform}.ph-l{position:absolute;inset:0;background:50% 50%/cover no-repeat;opacity:0;transform:scale(1.06);transition:opacity .9s ease,transform 7s ease-out}.ph-l.on{opacity:1;transform:scale(1)}
.ph-copy{width:100%;padding-top:32px;padding-bottom:28px;will-change:transform}.ph-hero h1{color:#F7F9FB;font-size:clamp(2.2rem,8vw,4rem);line-height:.95;margin:10px 0 0;max-width:18ch}.ph-hero nav.crumbs,.ph-hero nav.crumbs a{color:rgba(247,249,251,.82)}
.ph-pause{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:4px;border:0;background:rgba(8,14,26,.6);color:#fff;display:grid;place-items:center;cursor:pointer}.ph-pause svg{width:16px;height:16px;fill:currentColor}.ph-pause .pl,.ph-pause[aria-pressed="true"] .ps{display:none}.ph-pause[aria-pressed="true"] .pl{display:block}
.ph-credit{font-size:.75rem;color:var(--sub);text-align:right;margin:6px auto 0;min-height:1.1em}.ph-credit a{color:inherit;text-decoration:none}.ph-credit a:hover{text-decoration:underline}
.ph-tick{background:#0B1424;color:#F7F9FB;overflow:hidden;padding:12px 0;margin:14px 0 8px}.ph-row{overflow:hidden;white-space:nowrap}.ph-row+.ph-row{margin-top:6px}.ph-track{display:inline-flex;gap:28px;will-change:transform}
.ph-track span{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;text-transform:uppercase;font-size:1.5rem;line-height:1.1}.ph-track span::after{content:"";display:inline-block;width:8px;height:8px;margin-left:28px;background:var(--sig);vertical-align:middle}.ph-row[data-dir="-1"] span{opacity:.55}
@media (prefers-reduced-motion:reduce){.ph-l{transition:none;transform:none}.ph-copy,.ph-media,.ph-track{transform:none !important}}`;
const ANALYTICS = `<!-- Google Analytics --><script async src="https://www.googletagmanager.com/gtag/js?id=G-2XEE8686TF"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",region:["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB","CH"]});gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"granted"});try{var c=localStorage.getItem("pri-consent");if(c)gtag("consent","update",{analytics_storage:c==="yes"?"granted":"denied"})}catch(e){}gtag("js",new Date());gtag("config","G-2XEE8686TF");</script><!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "e52456a52f8540c69bb1ce758237400a"}'></script><!-- End Cloudflare Web Analytics -->`;
// Converts the Central-time start times (what search engines see) into the visitor's own time zone.
const LOCAL_TIME = `<script>(function(){try{var d=new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric"}),t=new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"});
document.querySelectorAll("[data-day]").forEach(function(e){e.textContent=d.format(new Date(e.dataset.day))});document.querySelectorAll("[data-time]").forEach(function(e){e.textContent=t.format(new Date(e.dataset.time))});
var z=Intl.DateTimeFormat().resolvedOptions().timeZone||"";document.querySelectorAll(".tzn").forEach(function(e){e.textContent=z.replace(/_/g," ").split("/").pop()+" time"})}catch(e){}})()</script>`;
// FAQ block: visible question headings + direct answers, and matching FAQPage schema (AEO)
function faqHTML(qa){ return qa.length ? `<section class="card faq"><h2>Questions fans ask</h2>${qa.map(([q, a]) => `<h3>${esc(q)}</h3><p>${a}</p>`).join("")}</section>` : ""; }
function faqLD(qa){ return qa.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })) } : null; }
const fitTitle = (...c) => c.find(x => x.length <= 60) || c[c.length - 1];
function clipDesc(d){ d = d.replace(/\s+/g, " ").trim(); if (d.length <= 158) return d; const cut = d.slice(0, 158), dot = cut.lastIndexOf(". "); return dot > 125 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:·–-]\s*$/, "") + "…"; }
const N_ALL = WORLD.series.length, N_APP = WORLD.series.filter(x => x.app).length, N_DATES = N_ALL - N_APP;
const ORG = { "@context": "https://schema.org", "@type": "Organization", "@id": "https://premierracinginfo.com/#org", name: "Premier Racing Info", url: "https://premierracinginfo.com/", logo: "https://premierracinginfo.com/icons/icon-512.png", email: "contact@premierracinginfo.com", sameAs: ["https://www.instagram.com/premier.racing.info/"], description: `Free, independent motorsport guide: every session start time for ${N_APP} top racing series in your time zone, race dates for ${N_DATES} more, where to watch in the US, tickets and standings.` };
const WEBSITE = { "@context": "https://schema.org", "@type": "WebSite", "@id": "https://premierracinginfo.com/#site", name: "Premier Racing Info", url: "https://premierracinginfo.com/", publisher: { "@id": "https://premierracinginfo.com/#org" }, inLanguage: "en-US" };
const fLong = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" });
const fUTC = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
const fUpd = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const listAnd = a => a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
// Words that slide sideways as you scroll, like the app's home page
function tickHTML(words){ const w = [...new Set(words.filter(Boolean))]; const inner = w.map(x => `<span>${esc(x)}</span>`).join(""); return `<div class="ph-tick" aria-hidden="true"><div class="ph-row" data-dir="1"><div class="ph-track">${inner}${inner}${inner}${inner}</div></div><div class="ph-row" data-dir="-1"><div class="ph-track">${inner}${inner}${inner}${inner}</div></div></div>`; }
function page({ url, title, desc, h1, crumbs = [], body, color, jsonld, appLink = "/", photo = [], tick, heroImg }){
  const canon = SITE + url;
  desc = clipDesc(desc);
  const ld = [].concat(jsonld || []).filter(Boolean).concat(url === "/about/" ? [ORG, WEBSITE] : [ORG]);
  ld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ name: "Premier Racing Info", item: SITE + "/" }].concat(crumbs).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })) });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Premier Racing Info"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE}/icons/og.png?v=3">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#F7F9FB"><link rel="icon" type="image/svg+xml" href="/icons/favicon.svg"><link rel="icon" type="image/png" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-180.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/albert-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>(function(){try{var t=localStorage.getItem("raceweekends-2026-theme");if(!t||t==="auto")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#141A22")}}catch(e){}})()</script><style>${CSS}</style>${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("")}</head>
<body style="${color ? `--c:${color}` : ""}"><header><div class="wrap top"><a class="brand" href="/" aria-label="Premier Racing Info home">${LOGO}<span class="lw" aria-hidden="true"><span class="lw1">PREMIER</span><span class="lw2">RACING INFO</span></span></a><a class="cta" href="${esc(appLink)}">Open the app</a></div></header>
<section class="ph-hero${heroImg ? " has-img" : ""}" data-w="${esc(photo.filter(Boolean).join(","))}"><div class="ph-media" aria-hidden="true">${heroImg ? `<div class="ph-l on" style="background-image:url('${esc(heroImg[0])}')"></div>` : `<div class="ph-l"></div><div class="ph-l"></div>`}</div><div class="wrap ph-copy">${crumbs.length ? `<nav class="crumbs"><a href="/">Home</a>${crumbs.map(c => ` › <a href="${esc(c.item.replace(SITE, ""))}">${esc(c.name)}</a>`).join("")}</nav>` : ""}<h1>${esc(h1)}</h1></div></section>
<p class="wrap ph-credit">${heroImg ? `Photo: ${esc(heroImg[1])}, used with permission` : ""}</p>${tickHTML(tick || [h1, "Start times in your time zone", "Where to watch", "Tickets", "Standings"])}
<main class="wrap">${body}<p class="updated">Page updated <time datetime="${today}">${fUpd.format(new Date(today))}</time>. Dates, start times and TV listings can change, so check the official series site before you travel.</p></main>
<footer class="wrap"><a href="/">App</a><a href="/#help">How the app works</a><a href="/#app">Get the app</a><a href="/calendar/">Race calendar</a><a href="/watch/">How to watch</a><a href="/tickets/">Tickets</a><a href="/races-in/">Races near you</a><a href="/series/">All series</a><a href="/esports/">eSports</a><a href="/recap/">2026 season reviews</a><a href="/tracks/">Tracks</a><a href="/teams/">Teams</a><a href="/about/">About</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://www.instagram.com/premier.racing.info/" rel="noopener me" target="_blank" style="font-weight:700;color:#D6249F;white-space:nowrap"><svg width="18" height="18" style="vertical-align:-4px;margin-right:6px" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor"/></svg>Follow @premier.racing.info</a><p>Start times are shown in your own time zone. Dates and TV deals can change; check the official sites. Premier Racing Info is an independent fan site, not affiliated with any series, team or circuit.</p></footer>${LOCAL_TIME}<script src="/hero.js" defer></script>${ANALYTICS}</body></html>`;
}
const pages = [];
const write = (url, content) => { const dir = path.join(root, url); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), content); pages.push(url); };
const watchList = s => (WATCH[s] || []).map(w => `<a class="btn" href="${esc(w[1])}" rel="noopener">${esc(w[0])}${w[2] ? " (free)" : ""}</a>`).join("");
const raceLink = e => `<a href="/races/${e.slug}/">${esc(e.name)}</a>`;

// ---- Race pages ----
for (const e of EV) {
  const nm = ["nascar", "indy", "motogp"].includes(e.s) && !e.name.includes(SERIES[e.s]) ? `${SERIES[e.s]} ${e.name}` : e.name;
  const full = SERIES_FULL[e.s], sess = SESSIONS[e.id] || [], tr = TRACKS[e.circuit], past = e.end < today;
  const mainRace = sess.filter(x => !x[2]).slice(-1)[0];
  let body = `<p class="lede">${esc(full)} · ${esc(e.circuit)}, ${esc(e.location)} · ${range(e.start, e.end)}${e.tags.length ? " · " + e.tags.map(esc).join(", ") : ""}</p>`;
  if (sess.length) body += `<section class="card"><h2>Start times (<span class="tzn">US Central time</span>)</h2><table><tr><th>Session</th><th>Day</th><th style="text-align:right">Time</th></tr>${sess.map(x => { const sw = SESSION_WATCH[e.id + "|" + x[0]]; return `<tr><td>${esc(x[0])}${x[2] ? ' <span class="tag">support</span>' : ""}${sw ? `<br><small><a href="${esc(sw[1])}" rel="noopener">Watch on ${esc(sw[0])}</a></small>` : ""}</td><td data-day="${x[1]}">${fDay.format(new Date(x[1]))}</td><td class="r" data-time="${x[1]}">${fTime.format(new Date(x[1]))}</td></tr>`; }).join("")}</table></section>`;
  else if (!past) body += `<section class="card"><h2>Start times</h2><p>Session times are usually published about a week before the race. They'll show here in your time zone as soon as they're out.</p></section>`;
  if (RESULT_FOR[e.id] && STATS[RESULT_FOR[e.id]]?.race?.rows) {
    const r = STATS[RESULT_FOR[e.id]].race;
    body += `<section class="card"><h2>Results</h2>${r.note ? `<p>${esc(r.note)}</p>` : ""}<table><tr><th>Pos</th><th>Driver</th><th>Team / car</th></tr>${r.rows.slice(0, 10).map(x => `<tr><td>${esc(x[0])}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td></tr>`).join("")}</table></section>`;
  } else if (WINNERS[e.id]) body += `<section class="card"><h2>Winner</h2><p>${esc(WINNERS[e.id])}</p></section>`;
  if (past || WINNERS[e.id] || HIGHLIGHTS[e.id]) {
    const hl = HIGHLIGHTS[e.id], q = encodeURIComponent(`${e.year} ${e.name} ${full} race highlights`);
    body += hl ? `<section class="card"><h2>Race highlights</h2><div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${esc(hl[0])}?rel=0" title="${esc(nm)} highlights" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p><small>Video: ${esc(hl[1])} on YouTube.</small></p></section>`
      : `<section class="card"><h2>Race highlights</h2><div class="btns"><a class="btn p" href="https://www.youtube.com/results?search_query=${q}" rel="noopener">▶ Watch highlights on YouTube</a></div></section>`;
  }
  body += `<section class="card"><h2>How to watch in the US</h2><div class="btns">${watchList(e.s)}</div></section>`;
  const tk = ticketLinks(e);
  if (tk.length) body += `<section class="card"><h2>Tickets</h2><div class="btns">${tk.map((t, i) => `<a class="btn${i === 0 ? " p" : ""}" href="${esc(t[1])}" rel="${relOf(t)}">${esc(t[0])}</a>`).join("")}</div>${tk.some(t => t[2] === "aff") ? `<p><small>${esc(AFF_NOTE)}</small></p>` : ""}</section>`;
  body += `<section class="card"><h2>The track</h2><p><a href="/tracks/${trackSlug(e.circuit)}/">${esc(e.circuit)}</a>, ${esc(e.location)}${tr ? ` · ${tr[0] ? tr[0].toFixed(2) + " km lap" : ""}${tr[1] ? ", " + tr[1] + " corners" : ""} · ${esc(tr[2])}. ${esc(tr[3])}.` : ""}</p></section>`;
  const same = EV.filter(o => o.circuit === e.circuit && o.id !== e.id && o.start <= e.end && o.end >= e.start);
  if (same.length) body += `<section class="card"><h2>Also racing this weekend</h2><ul class="list">${same.map(o => `<li>${raceLink(o)} <small>${esc(SERIES_FULL[o.s])}</small></li>`).join("")}</ul></section>`;
  body += `<p><a class="btn p" href="/?alerts=${e.s}&amp;from=race">🔔 Get ${esc(SERIES[e.s] || SERIES_FULL[e.s])} race alerts</a> <a class="btn" href="/?race=${e.id}">Open in the app for live updates and picks ›</a> <a class="btn" href="/series/${APP_TO_WORLD[e.s]}/">${esc(full)} calendar &amp; standings</a></p>`;
  // Direct answer up top + FAQ (start time, how to watch, free option, tickets, where)
  const place = GEO.places?.[e.circuit] || [], country = place[0] || "", watchN = (WATCH[e.s] || []).filter(w => !/timing|official site/i.test(w[0]));
  const free = (WATCH[e.s] || []).filter(w => w[2] && !/search_query/.test(w[1])).map(w => w[0]);
  const where = `${e.circuit} in ${e.location}${country && !e.location.includes(country) && country !== "United States" ? ", " + country : ""}`;
  let answer, qa = [];
  if (mainRace && !past) {
    const d = new Date(mainRace[1]);
    answer = `The ${full} ${nm} ${e.year} starts <b>${fLong.format(d)} at <span data-time="${mainRace[1]}">${fTime.format(d)}</span></b> (${fUTC.format(d)} UTC) at ${esc(where)}.${watchN.length ? ` In the US it's live on ${esc(listAnd(watchN.map(w => w[0])))}.` : ""}`;
    qa.push([`What time does the ${nm} ${e.year} start?`, `The main race starts ${fLong.format(d)} at ${fTime.format(d)} US Central time (${fUTC.format(d)} UTC). ${sess.length > 1 ? `The weekend runs ${range(e.start, e.end)}, with ${sess.length} sessions listed above in your own time zone.` : ""}`.trim()]);
  } else if (!past) {
    answer = `The ${full} ${nm} ${e.year} runs ${range(e.start, e.end)} at ${esc(where)}. Session times are usually published about a week before; this page updates when they're out.`;
    qa.push([`When is the ${nm} ${e.year}?`, `The ${nm} runs ${range(e.start, e.end)} at ${esc(where)}. Exact start times are usually published about a week before the race.`]);
  } else {
    const w = WINNERS[e.id];
    answer = `The ${full} ${nm} ${e.year} took place ${range(e.start, e.end)} at ${esc(where)}.${w ? ` Winner: ${esc(w)}.` : ""}`;
    if (w) qa.push([`Who won the ${nm} ${e.year}?`, esc(w) + "."]);
  }
  body = `<p class="answer">${answer}</p>` + body;
  if (watchN.length) qa.push([`How can I watch the ${nm} in the US?`, `${esc(full)} is shown in the US on ${esc(listAnd(watchN.map(w => w[0])))}.${watchN[0][3] ? " " + esc(watchN[0][3]) + "." : ""}`]);
  if (free.length) qa.push([`Is there a free way to watch the ${nm}?`, `Yes: ${esc(listAnd(free))} ${free.length > 1 ? "are" : "is"} free to watch in the US.`]);
  else if (watchN.length) qa.push([`Is the ${nm} free to watch?`, `Not in the US. Live coverage is on ${esc(listAnd(watchN.map(w => w[0])))}, which needs a subscription.`]);
  if (!past && tk[0] && !/google\.com/.test(tk[0][1])) qa.push([`Where can I buy tickets for the ${nm}?`, `Buy from the official seller: <a href="${esc(tk[0][1])}" rel="noopener">${esc(tk[0][0])}</a>. Resale prices vary, so start there.`]);
  qa.push([`Where is the ${nm} held?`, `At ${esc(where)}${tr && tr[0] ? `, a ${tr[0].toFixed(2)} km (${(tr[0] * 0.621371).toFixed(2)} mi) ${esc((tr[2] || "").toLowerCase()) || "circuit"}${tr[1] ? ` with ${tr[1]} corners` : ""}` : ""}.`]);
  body = body.replace('<p><a class="btn p" href="/?race=', faqHTML(qa) + '<p><a class="btn p" href="/?race=');
  const withSeries = e.s !== "f1" && nm === e.name, sx = withSeries ? `${SERIES[e.s]} ${nm}` : nm;
  const title = fitTitle(`${nm} ${e.year}${withSeries ? " – " + SERIES[e.s] : ""}: Start Times, How to Watch & Tickets`, `${sx} ${e.year}: Start Times, How to Watch & Tickets`, `${sx} ${e.year}: Start Times & How to Watch`, `${sx} ${e.year} Start Times`, `${sx} ${e.year}`);
  const desc = `${full} ${nm} ${e.year} at ${e.circuit}, ${range(e.start, e.end)}. ${mainRace ? `Race starts ${fDay.format(new Date(mainRace[1]))} at ${fTime.format(new Date(mainRace[1]))}. ` : ""}Session times in your time zone, how to watch in the US${tk.length ? ", tickets" : ""}${RESULT_FOR[e.id] || WINNERS[e.id] ? " and results" : ""}.`;
  const ld = { "@context": "https://schema.org", "@type": "SportsEvent", name: `${full} ${nm} ${e.year}`, sport: "Motorsport",
    startDate: SESSIONS[e.id]?.[0]?.[1] || e.start, endDate: (() => { const l = SESSIONS[e.id] || [], last = l.length ? l[l.length - 1][1] : ""; return last && last.slice(0, 10) >= e.end ? last : e.end; })(), eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.circuit, address: { "@type": "PostalAddress", addressLocality: e.location.split(",")[0], ...(place[1] ? { addressRegion: place[1] } : {}), ...(country ? { addressCountry: country } : {}) } }, organizer: { "@type": "SportsOrganization", name: full }, url: SITE + `/races/${e.slug}/`, image: SITE + "/icons/og.png?v=3", description: desc };
  if (tk[0] && !/google\.com/.test(tk[0][1])) ld.offers = { "@type": "Offer", url: tk[0][1], availability: "https://schema.org/InStock" };
  write(`/races/${e.slug}/`, page({ url: `/races/${e.slug}/`, title, desc, h1: `${nm} ${e.year}`, photo: [APP_TO_WORLD[e.s]], tick: [SERIES_FULL[e.s], e.circuit, e.location, "Start times", "Where to watch", "Tickets"], color: COLORS[e.s], jsonld: [ld, faqLD(qa)], appLink: `/?race=${e.id}`,
    crumbs: [{ name: full, item: SITE + `/series/${APP_TO_WORLD[e.s]}/` }, { name: `${nm} ${e.year}`, item: SITE + `/races/${e.slug}/` }], body }));
}

// ---- Series pages ----
const appOf = Object.fromEntries(Object.entries(APP_TO_WORLD).map(([a, w]) => [w, a]));
// Keep "Next round" current: tracked series read their calendar, others drop a date that has passed
{
  const M3 = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const endOf = txt => { // last day of the first date range in text like "Monza · Nov 6–8", as YYYY-MM-DD
    const m = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})(?:\s*[–-]\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* )?(\d{1,2}))?/.exec(txt || "");
    if (!m) return null;
    const t = new Date(today + "T12:00:00Z"), y = t.getUTCFullYear(), m1 = M3.indexOf(m[1].toLowerCase()), m2 = m[3] ? M3.indexOf(m[3].toLowerCase()) : m1;
    let b = new Date(Date.UTC(y, m2, +(m[4] || m[2])));
    if (m2 < m1) b = new Date(Date.UTC(y + 1, m2, +(m[4] || m[2])));
    if (b < new Date(Date.UTC(y, t.getUTCMonth() - 2, 1))) b.setUTCFullYear(y + 1); // "Jan 9" seen in November = next year
    return b.toISOString().slice(0, 10);
  };
  for (const x of WORLD.series) {
    const app = appOf[x.id];
    if (app) {
      const nx = EV.filter(e => e.s === app && e.end >= today).sort((a, b) => a.start.localeCompare(b.start))[0];
      x.next = nx ? `${nx.name} · ${(nx.year === today.slice(0, 4) ? range(nx.start, nx.end).replace(/, \d{4}$/, "") : range(nx.start, nx.end))}` : "";
    } else if (x.next) { const e = endOf(x.next); if (e && e < today) x.next = ""; }
  }
}
for (const x of WORLD.series) {
  const app = appOf[x.id];
  const watch = app ? WATCH[app] : (x.watch || []);
  let body = `<p class="lede">${esc(x.discipline)} · ${esc(x.level || "")} · ${esc(x.region || "")}</p>`;
  if (x.about) body += `<p>${esc(x.about)}</p>`;
  body += `<section class="card"><h2>${new Date().getFullYear()} season</h2><table>${[["Status", x.status], ["Champion", x.champion], ["Leader", x.leader], ["Next round", x.next], ["Season", x.season], ["Rounds", x.rounds], [x.discipline.startsWith("Moto") ? "Bikes" : "Cars", x.cars]].filter(r => r[1] || r[1] === 0).map(r => `<tr><th style="width:30%">${r[0]}</th><td>${esc(r[1])}</td></tr>`).join("")}</table></section>`;
  if (app) {
    const st = statsOf(app) || {};
    for (const yr of ["2026", "2027"]) {
      const list = EV.filter(e => e.s === app && e.year === yr);
      if (list.length) body += `<section class="card"><h2>${yr} calendar</h2><ul class="list">${list.map(e => `<li>${raceLink(e)} <small>${range(e.start, e.end)} · ${esc(e.circuit)}${WINNERS[e.id] ? " · " + esc(WINNERS[e.id]) : ""}${e.tags.includes("Provisional") ? " · provisional" : ""}</small></li>`).join("")}</ul></section>`;
    }
    if (st.champs) body += `<section class="card"><h2>Champions</h2><ul class="list">${st.champs.map(c => `<li><b>${esc(c[1])}</b> <small>${esc(c[0])}${c[2] ? " · " + esc(c[2]) : ""}</small></li>`).join("")}</ul></section>`;
    if (st.standings && !(st.champs && /before/i.test(st.standingsTitle || ""))) body += `<section class="card"><h2>${esc(st.standingsTitle || "Standings")}</h2><table><tr><th>Pos</th><th>Name</th><th style="text-align:right">Pts</th></tr>${st.standings.slice(0, 10).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r[0])}${r.length > 2 ? `<br><small>${esc(r[1])}</small>` : ""}</td><td class="r">${r[r.length - 1]}</td></tr>`).join("")}</table></section>`;
    if (st.grid) body += `<section class="card"><h2>${esc(st.gridTitle && !/format/i.test(st.gridTitle) ? st.gridTitle : "Teams and drivers")}</h2><ul class="list">${st.grid.map(g => `<li><b>${esc(g[0])}</b> <small>${esc(g[1])} · ${esc(g[2])}</small></li>`).join("")}</ul></section>`;
  }
  if (watch.length) body += `<section class="card"><h2>How to watch in the US</h2><div class="btns">${watch.map(w => `<a class="btn" href="${esc(w[1])}" rel="noopener">${esc(w[0])}${w[2] ? " (free)" : ""}</a>`).join("")}</div></section>`;
  if (app) body += `<p><a class="btn" href="/recap/${app}-2026/">2026 season in review ›</a></p>`;
  body += `<p>${x.site ? `<a class="btn" href="${esc(x.site)}" rel="noopener">Official site ↗</a> ` : ""}<a class="btn p" href="/?alerts=${esc(x.id)}&amp;from=series">🔔 Get race alerts</a> <a class="btn" href="/?series=${esc(x.id)}">Open in the app ›</a></p>`;
  const name = x.name, sn = x.short && x.short.length < name.length ? x.short : name;
  const wN = watch.filter(v => !/official site|timing/i.test(v[0])), frS = watch.filter(v => v[2] && !/search_query/.test(v[1])).map(v => v[0]);
  const sqa = [];
  if (x.about) sqa.push([`What is ${sn}?`, `${esc(name)} is ${/^[aeiou]/i.test(x.level || "") ? "an" : "a"} ${esc((x.level || "racing").toLowerCase())} ${esc(x.discipline.toLowerCase())} series (${esc(x.region || "")}). ${esc(x.about)}`]);
  if (x.champion) sqa.push([`Who won the ${new Date().getFullYear()} ${sn} championship?`, `${esc(x.champion)}.`]);
  else if (x.leader) sqa.push([`Who leads the ${sn} standings?`, `${esc(x.leader)}.`]);
  if (x.next) sqa.push([`When is the next ${sn} race?`, `${esc(x.next)}.`]);
  if (wN.length) sqa.push([`How can I watch ${sn} in the US?`, `On ${esc(listAnd(wN.map(v => v[0])))}.${frS.length ? ` Free: ${esc(listAnd(frS))}.` : ""}`]);
  { // teams in this series (from teams.js), plus the "add your team" invite
    const tl = ((global.window.TEAMS || {}).list || []).filter(t => t.series.includes(x.id)).sort((a, b) => a.name.localeCompare(b.name));
    const tc = `<section class="card"><h2>Teams</h2>${tl.length ? `<p>${tl.map(t => `<a href="/teams/${t.id}/">${esc(t.name)}</a>${t.status === "verified" ? " ✓" : ""}`).join(" · ")}</p>` : ""}<p><small>Run a ${esc(sn)} team? <a href="/teams/claim/">Add your team for free</a> with your photos, story and links for fans to support you.</small></p></section>`;
    sqa._teams = tc;
  }
  body = body.replace(/(<p>(?:<a class="btn" href="[^"]*" rel="noopener">Official site ↗<\/a> )?<a class="btn p" href="\/\?(?:series|alerts)=)/, sqa._teams + faqHTML(sqa) + "$1");
  const title = fitTitle(`${sn} ${app ? "2026–2027 Calendar, Standings" : "2026: Champion, Standings"} & How to Watch in the US`, `${sn} ${app ? "Calendar, Standings" : "Champion, Standings"} & How to Watch`, `${sn}: Standings & How to Watch`, `${sn} Standings`);
  const desc = `${name}: ${x.champion ? "2026 champion " + x.champion + ". " : x.leader ? "Leader " + x.leader + ". " : ""}${x.next ? "Next: " + x.next + ". " : ""}${app ? "Full calendar with start times in Central time, standings, " : ""}how to watch in the US and the official site.`;
  const descF = (desc.length < 125 && x.about ? desc.replace(/\. how to watch/, ". How to watch") + " " + x.about : desc.replace(/\. how to watch/, ". How to watch"));
  write(`/series/${x.id}/`, page({ url: `/series/${x.id}/`, title, desc: descF, h1: name, photo: [x.id], tick: [x.short || name, x.discipline, x.region, "Calendar", "Standings", "How to watch"].filter(Boolean), appLink: `/?series=${x.id}`, color: app ? COLORS[app] : undefined,
    crumbs: [{ name: "All series", item: SITE + "/series/" }, { name: x.short || name, item: SITE + `/series/${x.id}/` }], body,
    jsonld: [{ "@context": "https://schema.org", "@type": "SportsOrganization", name, sport: "Motorsport", url: x.site || SITE + `/series/${x.id}/`, ...(x.about ? { description: x.about } : {}) }, faqLD(sqa)] }));
}
// Series index
{
  const groups = {};
  for (const x of WORLD.series) (groups[x.discipline] = groups[x.discipline] || []).push(x);
  const body = `<p class="lede">${WORLD.series.length} racing series from around the world: champions, leaders, next rounds and how to watch from the US.</p>` +
    Object.entries(groups).map(([g, l]) => `<section class="card"><h2>${esc(g)}</h2><ul class="list">${l.map(x => `<li><a href="/series/${x.id}/">${esc(x.name)}</a> <small>${esc(x.region || "")}${x.champion ? " · " + esc(x.champion) : x.leader ? " · Leader: " + esc(x.leader) : ""}</small></li>`).join("")}</ul></section>`).join("");
  write("/series/", page({ url: "/series/", title: "Every Racing Series: Champions, Calendars & How to Watch", desc: `All ${WORLD.series.length} major racing series worldwide — F1, NASCAR, IndyCar, IMSA, WEC, MotoGP, WRC and more — with champions, standings and how to watch in the US.`, h1: "Every racing series", crumbs: [{ name: "All series", item: SITE + "/series/" }], body }));
}

// ---- Season recap pages: /recap/<series>-2026/ (off-season traffic: "2026 F1 season in review") ----
{
  const YEAR = "2026", NEXT = "2027";
  const winnerName = (s, w) => { // a single winner's name, or null for multi-race / crew entries
    if (!w || /·|R1|R2|both races|\//.test(w)) return null;
    if (s === "f1") return w.split(",")[0].trim();
    if (["nascar", "motogp", "indy"].includes(s)) return w.replace(/\s*\(.*\)\s*$/, "").trim();
    if (["psc", "pccna", "mustang"].includes(s)) return w.trim();
    return null;
  };
  const recaps = [];
  for (const app of Object.keys(SERIES)) {
    const list = EV.filter(e => e.s === app && e.year === YEAR).sort((a, b) => a.start.localeCompare(b.start));
    const st = statsOf(app) || {}, world = WORLD.series.find(w => w.id === APP_TO_WORLD[app]) || {};
    if (!list.length || (world.rounds && list.length < world.rounds)) continue; // only seasons we tracked from the start (NASCAR, IndyCar, MotoGP start in 2027)
    const done = list.filter(e => e.end < today), left = list.filter(e => e.end >= today);
    const complete = !left.length, full = SERIES_FULL[app], sn = SERIES[app];
    const champs = st.champs || [], driverChamp = champs[0];
    const tally = {};
    for (const e of done) { const n = winnerName(app, WINNERS[e.id]); if (n) tally[n] = (tally[n] || 0) + 1; }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const next = EV.filter(e => e.s === app && e.year === NEXT).sort((a, b) => a.start.localeCompare(b.start));
    const title1 = c => `${c[0].replace(/\b[A-Z][a-z]+/g, m => m.toLowerCase()).replace(/drivers$/, "drivers'").replace(/riders$/, "riders'").replace(/manufacturers$/, "manufacturers'").replace(/constructors$/, "constructors'")} title`;
    const plural = n => /\/| and /.test(n);
    const lede = complete
      ? `The ${YEAR} ${full} season is over: ${done.length} races${driverChamp ? `. ${driverChamp[1]} won the ${title1(driverChamp)}` : ""}.`
      : `${done.length} of ${list.length} races done in the ${YEAR} ${full} season, ${left.length} to go.${driverChamp ? ` ${driverChamp[1]} ${/clinch/i.test(driverChamp[2] || "") ? (plural(driverChamp[1]) ? "have" : "has") + " already clinched the " + title1(driverChamp) : "won the " + title1(driverChamp)}.` : st.standings ? ` ${st.standings[0][0]} leads the standings.` : ""}`;
    let body = `<p class="lede">${esc(lede)}</p>`;
    if (champs.length) body += `<section class="card"><h2>${YEAR} champions</h2><ul class="list">${champs.map(c => `<li><b>${esc(c[1])}</b> <small>${esc(c[0])}${c[2] ? " · " + esc(c[2]) : ""}</small></li>`).join("")}</ul></section>`;
    if (top.length) {
      body += `<section class="card"><h2>Most wins</h2><table><tr><th>Driver</th><th style="text-align:right">Wins</th></tr>${top.slice(0, 8).map(([n, c]) => `<tr><td>${esc(n)}</td><td class="r">${c}</td></tr>`).join("")}</table><p class="fine">${top.length} different winners in ${done.length} races${complete ? "" : " so far"}.</p></section>`;
    }
    if (st.standings) body += `<section class="card"><h2>${esc(st.standingsTitle || "Standings")}</h2><table><tr><th>Pos</th><th>Name</th><th style="text-align:right">Pts</th></tr>${st.standings.slice(0, 10).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r[0])}${r.length > 2 ? `<br><small>${esc(r[1])}</small>` : ""}</td><td class="r">${r[r.length - 1]}</td></tr>`).join("")}</table></section>`;
    if (st.makers) body += `<section class="card"><h2>${esc(st.makersTitle || "Teams")}</h2><table>${st.makers.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r[0])}</td><td class="r">${r[1]}</td></tr>`).join("")}</table></section>`;
    body += `<section class="card"><h2>Every race and winner</h2><table><tr><th>Race</th><th>Winner</th></tr>${list.map(e => `<tr><td>${raceLink(e)}<br><small>${range(e.start, e.end)} · ${esc(e.circuit)}</small></td><td>${e.end < today ? esc(WINNERS[e.id] || "—") : `<small>Coming up</small>`}</td></tr>`).join("")}</table></section>`;
    if (st.notes && st.notes.length) body += `<section class="card"><h2>Notes</h2><ul class="list">${st.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></section>`;
    if (next.length) body += `<section class="card"><h2>What's next: ${NEXT}</h2><p>The ${NEXT} season starts with ${raceLink(next[0])} (${range(next[0].start, next[0].end)}), ${next.length} races in all.${app === "f1" || app === "nascar" || app === "indy" || app === "motogp" ? ` Make your ${NEXT} title picks in the app's predictions game.` : ""}</p><div class="btns"><a class="btn" href="/series/${APP_TO_WORLD[app]}/">${NEXT} calendar</a>${["f1", "nascar", "indy", "motogp"].includes(app) ? `<a class="btn p" href="/#predict">${NEXT} predictions ›</a>` : ""}</div></section>`;
    const qa = [];
    if (driverChamp) qa.push([`Who won the ${YEAR} ${sn} championship?`, `${esc(driverChamp[1])} (${esc(driverChamp[0].toLowerCase())}${driverChamp[2] ? ", " + esc(driverChamp[2]) : ""}).`]);
    if (top.length) qa.push([`Who won the most ${sn} races in ${YEAR}?`, `${esc(top[0][0])}, with ${top[0][1]} win${top[0][1] > 1 ? "s" : ""}${top[1] && top[1][1] === top[0][1] ? " (tied with " + esc(top[1][0]) + ")" : ""}.`]);
    qa.push([`How many races were in the ${YEAR} ${sn} season?`, `${list.length}${complete ? "" : `, with ${left.length} still to run as of ${range(today, today)}`}.`]);
    if (next.length) qa.push([`When does the ${NEXT} ${sn} season start?`, `${esc(next[0].name)}, ${range(next[0].start, next[0].end)}.`]);
    body += faqHTML(qa);
    const url = `/recap/${app}-${YEAR}/`;
    const title = fitTitle(`${YEAR} ${full} Season in Review: Champions & Every Winner`, `${YEAR} ${sn} Season in Review: Champions & Every Winner`, `${YEAR} ${sn} Season in Review`);
    const desc = `${YEAR} ${full} season recap: ${driverChamp ? "champion " + driverChamp[1] + ", " : ""}${top.length ? "most wins " + top[0][0] + " (" + top[0][1] + "), " : ""}final standings and the winner of all ${list.length} races. Plus when ${NEXT} starts.`;
    write(url, page({ url, title, desc, h1: `${YEAR} ${sn} season in review`, photo: [APP_TO_WORLD[app]], color: COLORS[app], appLink: `/?series=${APP_TO_WORLD[app]}`,
      tick: [full, `${YEAR} champions`, "Every winner", "Final standings", `${NEXT} calendar`],
      crumbs: [{ name: "Season reviews", item: SITE + "/recap/" }, { name: `${YEAR} ${sn}`, item: SITE + url }], body,
      jsonld: [{ "@context": "https://schema.org", "@type": "Article", headline: `${YEAR} ${full} season in review`, dateModified: today, author: ORG.name ? { "@type": "Organization", name: ORG.name } : undefined }, faqLD(qa)] }));
    recaps.push({ app, url, sn, full, complete, champ: driverChamp });
  }
  const body = `<p class="lede">Every ${YEAR} season we track: champions, most wins, final standings and every race winner.</p><section class="card"><ul class="list">${recaps.map(r => `<li><a href="${r.url}">${esc(YEAR + " " + r.full)}</a> <small>${r.champ ? esc(r.champ[1]) : ""}${r.complete ? "" : (r.champ ? " · " : "") + "season still running"}</small></li>`).join("")}</ul></section>`;
  write("/recap/", page({ url: "/recap/", title: `${YEAR} Racing Seasons in Review: Champions & Winners`, desc: `${YEAR} season reviews for F1, NASCAR, IndyCar, MotoGP, IMSA, WEC, GT World Challenge and Porsche Cup: champions, most wins and every race winner.`, h1: `${YEAR} seasons in review`, crumbs: [{ name: "Season reviews", item: SITE + "/recap/" }], body }));
}

// ---- Track pages ----
const circuits = [...new Set(EV.map(e => e.circuit))];
for (const c of circuits) {
  const list = EV.filter(e => e.circuit === c).sort((a, b) => a.start.localeCompare(b.start));
  const loc = list[0].location, tr = TRACKS[c], up = list.filter(e => e.end >= today);
  let body = `<p class="lede">${esc(loc)}${GEO.places?.[c] && !loc.includes(GEO.places[c][0]) && GEO.places[c][0] !== "United States" ? ", " + esc(GEO.places[c][0]) : ""}${tr ? ` · ${tr[0] ? tr[0].toFixed(2) + " km (" + (tr[0] * 0.621371).toFixed(2) + " mi)" : ""}${tr[1] ? ", " + tr[1] + " corners" : ""} · ${esc(tr[2])}` : ""}</p>`;
  if (tr && tr[3]) body += `<p>${esc(tr[3])}.</p>`;
  if (up.length) body += `<section class="card"><h2>Upcoming races</h2><ul class="list">${up.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${range(e.start, e.end)}${e.tags.includes("Provisional") ? " · provisional" : ""}</small></li>`).join("")}</ul></section>`;
  const G = TRACK_GUIDES[c];
  if (G) {
    const ul = a => `<ul class="tips">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    body += `<section class="card guide"><h2>Going to ${esc(c)}</h2><h3>Getting there and parking</h3>${ul(G.getThere)}<h3>Bags and coolers</h3>${ul(G.bags)}<h3>Tips</h3>${ul(G.tips)}<p><small>Rules can change by event, so check the track's own pages before you go: ${G.src.map(x => `<a href="${esc(x[1])}" rel="noopener">${esc(x[0])}</a>`).join(", ")}. Last checked ${fUpd.format(new Date(G.checked))}.</small></p></section>`;
  }
  const past = list.filter(e => e.end < today);
  if (past.length) body += `<section class="card"><h2>Earlier in 2026</h2><ul class="list">${past.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${range(e.start, e.end)}${WINNERS[e.id] ? " · " + esc(WINNERS[e.id]) : ""}</small></li>`).join("")}</ul></section>`;
  const tk = up[0] ? ticketLinks(up[0]) : [];
  if (tk.length) body += `<section class="card"><h2>Tickets</h2><div class="btns">${tk.map((t, i) => `<a class="btn${i === 0 ? " p" : ""}" href="${esc(t[1])}" rel="${relOf(t)}">${esc(t[0])}</a>`).join("")}</div>${tk.some(t => t[2] === "aff") ? `<p><small>${esc(AFF_NOTE)}</small></p>` : ""}</section>`;
  const sl = trackSlug(c), yrs = [...new Set(list.map(e => e.year))].join("–");
  const serNames = [...new Set(list.map(e => SERIES_FULL[e.s]))];
  const ans = up[0] ? `The next race at ${c} is the ${SERIES_FULL[up[0].s]} ${up[0].name}, ${range(up[0].start, up[0].end)}.` : `${c} has no more races on our calendar right now.`;
  body = body.replace("</p>", `</p><p><b>${esc(ans)}</b> ${esc(c)} hosts ${esc(listAnd(serNames))} on our calendar${up.length > 1 ? `, ${up.length} upcoming race weekends in all` : ""}.</p>`);
  const tqa = [[`When is the next race at ${c}?`, esc(ans) + (up[0] ? ` Start times for every session are on the <a href="/races/${up[0].slug}/">race page</a>.` : "")],
    [`Where is ${c}?`, `${esc(loc)}${tr && tr[0] ? `. The track is ${tr[0].toFixed(2)} km (${(tr[0] * 0.621371).toFixed(2)} mi) long${tr[1] ? " with " + tr[1] + " corners" : ""}` : ""}.`],
    [`What races are held at ${c}?`, `${esc(listAnd(serNames))}.`]];
  if (G) { if (G.cooler) tqa.push([`Can I bring a cooler to ${c}?`, esc(G.cooler)]); tqa.push([`Where do I park at ${c}?`, esc(G.getThere[1])]); }
  if (tk.length) tqa.push([`How do I buy tickets for ${c}?`, `Use the official seller: ${esc(tk[0][0])}. Links are in the Tickets section above.`]);
  body += faqHTML(tqa);
  write(`/tracks/${sl}/`, page({ url: `/tracks/${sl}/`, title: fitTitle(`${c} Race Schedule ${yrs}: Every Race, Dates & Tickets`, `${c} Race Schedule ${yrs}: Dates & Tickets`, `${c} Race Schedule ${yrs}`, `${c} Races ${yrs}`), desc: `${ans} All races at ${c} (${loc}) in ${yrs}: ${serNames.join(", ")}, with dates, start times in your time zone and official tickets.`,
    h1: c, photo: [...new Set(list.map(e => APP_TO_WORLD[e.s]))], tick: [c, loc].concat([...new Set(list.map(e => SERIES_FULL[e.s]))]), crumbs: [{ name: "Tracks", item: SITE + "/tracks/" }, { name: c, item: SITE + `/tracks/${sl}/` }], body,
    jsonld: [{ "@context": "https://schema.org", "@type": "StadiumOrArena", name: c, address: loc, ...(CIRCUIT_SITES[c] ? { url: CIRCUIT_SITES[c] } : {}) }, faqLD(tqa)] }));
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
{ // /texas/ moved to /races-in/united-states/texas/ (kept so old links and search results still work)
  const to = SITE + "/races-in/united-states/texas/";
  fs.mkdirSync(path.join(root, "texas"), { recursive: true });
  fs.writeFileSync(path.join(root, "texas", "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Races in Texas</title><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="robots" content="noindex"></head><body><a href="${to}">Races in Texas</a></body></html>`);
}
{ // Races by place: region → country → state/province
  const places = GEO.places || {}, REG = GEO.region || {}, STN = GEO.states || {};
  const short = c => ({ "United States": "USA", "United Kingdom": "UK" })[c] || c;
  const stN = (c, st) => (STN[c] || {})[st] || st;
  const up = EV.filter(e => e.end >= today && places[e.circuit]).sort((a, b) => a.start.localeCompare(b.start));
  const listOf = l => Object.entries(byMonth(l)).map(([k, x]) => `<section class="card"><h2>${monthLabel(k)}</h2><ul class="list">${x.map(e => `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${esc(e.circuit)}, ${esc(e.location)} · ${range(e.start, e.end)}</small></li>`).join("")}</ul></section>`).join("");
  const seriesOf = l => [...new Set(l.map(e => SERIES_FULL[e.s]))].slice(0, 5).join(", ");
  const countries = [...new Set(up.map(e => places[e.circuit][0]))].sort();
  const regions = ["North America","South America","Europe","Middle East","Asia","Oceania","Africa"].filter(r => countries.some(c => REG[c] === r));
  const cURL = c => `/races-in/${slug(c)}/`, sURL = (c, st) => `/races-in/${slug(c)}/${slug(stN(c, st))}/`;
  const idx = regions.map(r => `<section class="card"><h2>${esc(r)}</h2><ul class="list">${countries.filter(c => REG[c] === r).map(c => {
      const l = up.filter(e => places[e.circuit][0] === c), sts = [...new Set(l.map(e => places[e.circuit][1]).filter(Boolean))].sort((a, b) => stN(c, a).localeCompare(stN(c, b)));
      return `<li><a href="${cURL(c)}">${esc(c)}</a> <small>${l.length} race${l.length === 1 ? "" : "s"}${sts.length ? " · " + sts.map(st => `<a href="${sURL(c, st)}">${esc(stN(c, st))}</a>`).join(", ") : ""}</small></li>`; }).join("")}</ul></section>`).join("");
  write("/races-in/", page({ url: "/races-in/", title: "Races Near You 2026–2027: Racing by Country, State & Region", desc: `Find upcoming races near you: ${up.length} races in ${countries.length} countries, sorted by region, country and state, with dates and tickets.`, h1: "Races near you", crumbs: [{ name: "Races near you", item: SITE + "/races-in/" }],
    body: `<p class="lede">Pick your country or state to see every upcoming race there, with dates and ticket links. The app's Tickets tab can remember your location.</p>${idx}` }));
  const placeQA = (n, l) => { // answer sentence + FAQ for a country or state
    const o = [...l].sort((a, b) => a.start.localeCompare(b.start)), nx = o[0], trk = [...new Set(o.map(e => e.circuit))];
    const ans = nx ? `The next race in ${n} is the ${SERIES_FULL[nx.s]} ${nx.name} at ${nx.circuit}, ${range(nx.start, nx.end)}.` : "";
    const qa = nx ? [[`When is the next race in ${n}?`, `${esc(ans)} Session times are on the <a href="/races/${nx.slug}/">race page</a>.`],
      [`What race tracks are in ${n}?`, `${esc(listAnd(trk))}.`],
      [`What racing series come to ${n}?`, `${esc(listAnd([...new Set(o.map(e => SERIES_FULL[e.s]))]))}, ${o.length} upcoming race weekend${o.length === 1 ? "" : "s"} in all.`]] : [];
    return { ans, qa };
  };
  for (const c of countries) {
    const l = up.filter(e => places[e.circuit][0] === c), sts = [...new Set(l.map(e => places[e.circuit][1]).filter(Boolean))];
    const stLinks = sts.length > 1 || (sts.length && STN[c]) ? `<p class="btns">${sts.sort((a, b) => stN(c, a).localeCompare(stN(c, b))).map(st => `<a class="btn" href="${sURL(c, st)}">${esc(stN(c, st))}</a>`).join("")}</p>` : "";
    const pq = placeQA(c, l);
    write(cURL(c), page({ url: cURL(c), title: `Races in ${c} 2026–2027: Schedule, Dates & Tickets`, desc: `${pq.ans} Every upcoming race in ${c}: ${seriesOf(l)}. ${l.length} races with dates, start times and tickets.`, h1: `Races in ${short(c)}`,
      crumbs: [{ name: "Races near you", item: SITE + "/races-in/" }, { name: short(c), item: SITE + cURL(c) }], body: `<p class="lede">${l.length} upcoming race${l.length === 1 ? "" : "s"} in ${esc(c)} (${esc(REG[c] || "")}).</p>${pq.ans ? `<p><b>${esc(pq.ans)}</b></p>` : ""}${stLinks}${listOf(l)}${faqHTML(pq.qa)}`, jsonld: faqLD(pq.qa) }));
    for (const st of sts) {
      const ls = l.filter(e => places[e.circuit][1] === st), n = stN(c, st), sq = placeQA(n, ls);
      write(sURL(c, st), page({ url: sURL(c, st), title: fitTitle(`Races in ${n} 2026–2027: Schedule, Dates & Tickets`, `Races in ${n} 2026–2027: Dates & Tickets`), desc: `${sq.ans} Every upcoming race in ${n}, ${short(c)}: ${seriesOf(ls)}, with dates, start times and official tickets.`, h1: `Races in ${n}`,
        crumbs: [{ name: "Races near you", item: SITE + "/races-in/" }, { name: short(c), item: SITE + cURL(c) }, { name: n, item: SITE + sURL(c, st) }],
        body: `<p class="lede">${ls.length} upcoming race${ls.length === 1 ? "" : "s"} in ${esc(n)}, ${esc(short(c))}.</p>${sq.ans ? `<p><b>${esc(sq.ans)}</b></p>` : ""}${listOf(ls)}${faqHTML(sq.qa)}<p><a class="btn" href="${cURL(c)}">All races in ${esc(short(c))}</a></p>`, jsonld: faqLD(sq.qa) }));
    }
  }
}
{ // How to watch
  const rows = WORLD.series.map(x => { const app = appOf[x.id]; const w = app ? WATCH[app] : (x.watch || []); return [x, w.filter(v => v[0] !== "Official site")]; });
  const body = `<p class="lede">Where to stream or watch every major racing series in the United States, with free options marked.</p><section class="card"><table><tr><th>Series</th><th>Watch in the US</th></tr>${rows.map(([x, w]) => `<tr><td><a href="/series/${x.id}/">${esc(x.short || x.name)}</a></td><td>${w.map(v => `<a href="${esc(v[1])}" rel="noopener">${esc(v[0])}</a>${v[2] ? " (free)" : ""}`).join(", ") || esc(x.watch_us || "")}</td></tr>`).join("")}</table></section>`;
  const top = ["f1", "nascar-cup", "indycar", "motogp", "imsa", "wec", "formulae", "wrc", "supercars", "supercross", "nhra", "gtwc-america"];
  const wqa = top.map(id => rows.find(r => r[0].id === id)).filter(r => r && r[1].length).map(([x, w]) => { const fr = w.filter(v => v[2] && !/search_query/.test(v[1])).map(v => v[0]);
    return [`How can I watch ${x.short || x.name} in the US?`, `${esc(x.short || x.name)} is on ${esc(listAnd(w.map(v => v[0])))}.${fr.length ? ` Free option: ${esc(listAnd(fr))}.` : ""} <a href="/series/${x.id}/">${esc(x.short || x.name)} schedule</a>.`]; });
  const sumUp = top.slice(0, 6).map(id => rows.find(r => r[0].id === id)).filter(r => r && r[1].length).map(([x, w]) => `${esc(x.short || x.name)} on ${esc(listAnd(w.slice(0, 2).map(v => v[0])))}`);
  const wbody = `<p class="answer">In the US: ${listAnd(sumUp)}. The table below lists all ${rows.length} series, with free options marked.</p>` + body.replace('<section class="card"><table>', '<section class="card"><h2>Every series and where to watch it</h2><table>') + faqHTML(wqa);
  write("/watch/", page({ url: "/watch/", title: "How to Watch Racing in the US: F1, NASCAR, IndyCar & More", jsonld: faqLD(wqa), desc: "Where to watch every racing series in the US: F1, NASCAR, IndyCar, MotoGP, IMSA, WEC, WRC, Supercross and more, including free streams.", h1: "How to watch racing in the US", crumbs: [{ name: "How to watch", item: SITE + "/watch/" }], body: wbody }));
}
{ // Tickets
  const up = EV.filter(e => e.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const body = `<p class="lede">Ticket links for every upcoming race: the official seller first, then the circuit and a ticket search.</p>` +
    Object.entries(byMonth(up)).map(([k, l]) => `<section class="card"><h2>${monthLabel(k)}</h2><ul class="list">${l.map(e => { const t = ticketLinks(e)[0]; return `<li>${raceLink(e)} <small>${esc(SERIES_FULL[e.s])} · ${esc(e.circuit)} · ${range(e.start, e.end)}${t ? ` · <a href="${esc(t[1])}" rel="${relOf(t)}">${esc(t[0])}</a>` : ""}</small></li>`; }).join("")}</ul></section>`).join("");
  write("/tickets/", page({ url: "/tickets/", title: "Race Tickets 2026–2027: F1, IMSA, WEC & GT Races", desc: "Where to buy tickets for every upcoming F1, IMSA, WEC, GT World Challenge, Porsche Cup and Mustang Challenge race, from the official sellers.", h1: "Race tickets", crumbs: [{ name: "Tickets", item: SITE + "/tickets/" }], body }));
}

const CONTACT = "contact@premierracinginfo.com";
// ---- Team profiles (/teams/, /teams/<id>/, /teams/claim/) from teams.js ----
// Unclaimed profiles are facts only. Verified profiles add what the team sent through the claim form.
{
  const SB_URL = (html.match(/const SUPABASE_URL = "([^"]+)"/) || [])[1] || "", SB_KEY = (html.match(/const SUPABASE_ANON_KEY = "([^"]+)"/) || [])[1] || "";
  const wById = Object.fromEntries(WORLD.series.map(x => [x.id, x]));
  const sName = id => wById[id] ? (wById[id].short || wById[id].name) : id;
  const statsFor = wid => STATS[appOf[wid]] || MORE_STATS[wid] || null;
  const yr = today.slice(0, 4);
  const ordinal = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const isTeam = (label, t) => label === t.stats || String(label).startsWith(t.stats + " ");
  const SOCIAL = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["x", "X"], ["facebook", "Facebook"]];
  const SUPPORT = [["merch", "Shop team merch"], ["sponsor", "Sponsor the team"], ["donate", "Donate / support"]];
  const safeUrl = u => /^https:\/\//.test(u || "") ? u : "";
  const TEAMS_CSS = `<style>.ph-hero[data-w="none"]:not(.has-img){min-height:auto;background:repeating-linear-gradient(115deg,transparent 0 22px,rgba(133,176,255,.07) 22px 24px),#0B1424}.ph-hero[data-w="none"]:not(.has-img) .ph-copy{padding-top:56px}.vbadge{display:inline-block;font-size:.8rem;font-weight:700;border-radius:4px;padding:2px 8px;margin:0 0 12px;border:1px solid var(--rule);color:var(--sub)}.vbadge.ok{background:var(--sig);border-color:var(--sig);color:var(--bg)}.claim{border:2px dashed var(--rule);border-radius:8px;padding:14px 16px;margin:0 0 20px}.claim h2{margin-bottom:4px}.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.gal figure{margin:0}.gal img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:6px;display:block}.gal figcaption{font-size:.75rem;color:var(--sub);margin-top:4px}.tlogo{width:84px;height:84px;object-fit:contain;border-radius:8px;background:var(--panel2);float:right;margin:0 0 10px 14px}form.cf label{display:block;font-weight:600;font-size:.92rem;margin:14px 0 4px}form.cf small.h{display:block;color:var(--sub);font-weight:400;font-size:.8rem}form.cf input:not([type=checkbox]):not([type=radio]),form.cf textarea,form.cf select{width:100%;font:inherit;padding:9px 10px;border:1px solid var(--rule);border-radius:6px;background:var(--panel2);color:var(--ink)}form.cf textarea{min-height:110px}form.cf .chk{display:flex;gap:10px;align-items:flex-start;font-weight:400;margin:12px 0}form.cf .chk input{margin-top:4px;flex:none;width:18px;height:18px}form.cf fieldset{border:0;border-top:2px solid var(--ink);padding:14px 0 0;margin:22px 0 0}form.cf legend{font-family:"Saira Condensed",system-ui,sans-serif;font-weight:800;text-transform:uppercase;font-size:1.2rem;padding:0 8px 0 0}form.cf button{font:inherit;font-weight:700;cursor:pointer;margin-top:16px;padding:12px 18px}.two{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}@media(max-width:560px){.two{grid-template-columns:1fr}}#cfDone{display:none}.err{color:#C0262D;font-weight:600}</style>`;
  const list = (global.window.TEAMS && global.window.TEAMS.list) || [];

  for (const t of list) {
    const main = t.series[0], st = statsFor(main), app = appOf[main];
    const ver = t.status === "verified";
    const grid = st && st.grid ? st.grid.find(g => isTeam(g[0], t)) : null;
    const mk = st && st.makers ? st.makers.findIndex(m => isTeam(m[0], t)) : -1;
    const drv = st && st.standings ? st.standings.map((r, i) => [i + 1, ...r]).filter(r => isTeam(r[2], t)) : [];
    const driverNames = t.drivers || (grid ? grid[2].split(" · ").map(x => x.replace(/\s*\(.*\)$/, "")) : drv.map(r => r[1]));
    const since = t.since ? `${t.since}${t.sinceNote ? ` (${t.sinceNote})` : ""}` : "";
    const answer = `${t.name} is ${/^[AEIOU8]|^F1|^IMSA|^SRO|^MX/i.test(sName(main)) ? "an" : "a"} ${sName(main)} team based in ${t.base}, ${t.country}${since ? `, racing in ${sName(main)} since ${since}` : ""}.${driverNames.length ? ` Its ${yr} drivers: ${listAnd(driverNames)}.` : ""}${mk >= 0 ? ` It's ${ordinal(mk + 1)} in the ${yr} ${st.makersTitle ? st.makersTitle.toLowerCase() : "team standings"} with ${st.makers[mk][1]} points.` : ""}`;
    let body = TEAMS_CSS + `<p class="answer">${esc(answer)}</p>`;
    body += ver ? `<span class="vbadge ok">✓ Verified team profile</span>` : `<span class="vbadge">Unclaimed profile · public facts only</span>`;
    if (ver && (t.bio || t.logo)) body += `<section class="card"><h2>About ${esc(t.name)}</h2>${t.logo ? `<img class="tlogo" src="${esc(t.logo)}" alt="${esc(t.name)} logo" loading="lazy">` : ""}<p>${esc(t.bio || "")}</p><p><small>Written by the team.</small></p></section>`;
    if (!ver) body += `<section class="claim"><h2>Is this your team?</h2><p>Claim this profile for free to add your logo, photos, your story, social links and ways for fans to support you. We check every claim with the team before anything goes live.</p><a class="btn p" href="/teams/claim/?team=${esc(t.id)}">Claim this profile ›</a></section>`;
    const sup = ver && t.support ? SUPPORT.filter(([k]) => safeUrl(t.support[k])) : [];
    if (sup.length) body += `<section class="card"><h2>Support ${esc(t.name)}</h2><p>Links from the team. Buying merch or sponsoring helps them go racing.</p><div class="btns">${sup.map(([k, l]) => `<a class="btn${k === sup[0][0] ? " p" : ""}" href="${esc(t.support[k])}" rel="noopener" target="_blank" data-sup="${k}">${l}</a>`).join("")}</div></section>`;
    const facts = [["Series", t.series.map(s => wById[s] ? `<a href="/series/${esc(s)}/">${esc(sName(s))}</a>` : esc(s)).join(", ")], ["Base", esc(`${t.base}, ${t.country}`)], since && ["In the series since", esc(since)], grid && ["Power unit", esc(grid[1])], driverNames.length && [`${yr} drivers`, esc(driverNames.join(", "))], mk >= 0 && [`${yr} standing`, esc(`${ordinal(mk + 1)} · ${st.makers[mk][1]} pts`)], t.site && ["Official site", `<a href="${esc(t.site)}" rel="noopener">${esc(t.site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a>`]].filter(Boolean);
    body += `<section class="card"><h2>Team facts</h2><table>${facts.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table></section>`;
    if (drv.length) body += `<section class="card"><h2>${esc(st.standingsTitle || "Standings")}</h2><table><tr><th>Pos</th><th>Driver</th><th class="r">Pts</th></tr>${drv.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}${r[2] !== t.stats ? ` <small>${esc(r[2].slice(t.stats.length).trim())}</small>` : ""}</td><td class="r">${r[3]}</td></tr>`).join("")}</table><p><a href="/series/${esc(main)}/">Full ${esc(sName(main))} standings ›</a></p></section>`;
    if (ver && t.photos && t.photos.length) body += `<section class="card"><h2>Photos</h2><div class="gal">${t.photos.map(([src, cr]) => `<figure><img src="${esc(src)}" alt="${esc(t.name)}" loading="lazy"><figcaption>Photo: ${esc(cr)}, used with permission</figcaption></figure>`).join("")}</div></section>`;
    const soc = ver && t.socials ? SOCIAL.filter(([k]) => safeUrl(t.socials[k])) : [];
    if (soc.length) body += `<section class="card"><h2>Follow ${esc(t.name)}</h2><div class="btns">${soc.map(([k, l]) => `<a class="btn" href="${esc(t.socials[k])}" rel="noopener me" target="_blank">${l}</a>`).join("")}</div></section>`;
    const next = app ? EV.filter(e => e.s === app && e.end >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3) : [];
    if (next.length) body += `<section class="card"><h2>Next races</h2><ul class="list">${next.map(e => `<li>${raceLink(e)}<small>${esc(e.circuit)} · ${range(e.start, e.end)}</small></li>`).join("")}</ul></section>`;
    const qa = [[`Where is ${t.name} based?`, esc(`${t.base}, ${t.country}.`)]];
    if (since) qa.push([`When did ${t.name} start racing in ${sName(main)}?`, esc(`${since}.`)]);
    if (driverNames.length) qa.push([`Who drives for ${t.name} in ${yr}?`, esc(`${listAnd(driverNames)}.`)]);
    body += faqHTML(qa);
    if (!ver) body += `<p><small>This page lists public facts only. ${esc(t.name)} is a trademark of its owner; Premier Racing Info isn't affiliated with the team. Facts checked ${esc(t.checked || "")}.</small></p>`;
    const sameAs = [t.site, ...(ver && t.socials ? Object.values(t.socials) : [])].filter(safeUrl);
    const ld = { "@context": "https://schema.org", "@type": "SportsTeam", name: t.name, sport: "Motorsport", url: `${SITE}/teams/${t.id}/`, location: { "@type": "Place", name: `${t.base}, ${t.country}` }, ...(sameAs.length ? { sameAs } : {}), ...(driverNames.length ? { athlete: driverNames.map(n => ({ "@type": "Person", name: n })) } : {}) };
    const hero = ver && t.photos && t.photos[0] ? t.photos[0] : null;
    write(`/teams/${t.id}/`, page({ url: `/teams/${t.id}/`, title: fitTitle(`${t.name} ${sName(main)} Team: Drivers, Base & ${yr} Results`, `${t.name}: ${sName(main)} Team Profile`, t.name), desc: answer, h1: t.name, crumbs: [{ name: "Teams", item: SITE + "/teams/" }, { name: t.name, item: `${SITE}/teams/${t.id}/` }], jsonld: [ld, faqLD(qa)], body, color: COLORS[app], photo: ["none"], heroImg: hero, tick: [t.name, sName(main), t.base, ...driverNames] }));
  }

  { // Team directory
    const by = {};
    for (const t of list) (by[t.series[0]] = by[t.series[0]] || []).push(t);
    let body = TEAMS_CSS + `<p class="answer">Profiles of racing teams: where they're based, who drives for them, how their season is going and how fans can support them. ${list.length} teams so far, with more added as teams join.</p>`;
    body += `<section class="claim"><h2>Run a race team?</h2><p>Get a free profile on Premier Racing Info. Add your logo, photos, story, socials and links to your merch, sponsorship or fundraising page, and get in front of fans who follow your series. Club, grassroots, karting and pro teams are all welcome.</p><div class="btns"><a class="btn p" href="/teams/claim/">Add or claim your team ›</a></div></section>`;
    for (const [s, ts] of Object.entries(by)) body += `<section class="card"><h2>${esc(sName(s))}</h2><ul class="list">${ts.sort((a, b) => a.name.localeCompare(b.name)).map(t => `<li><a href="/teams/${t.id}/">${esc(t.name)}</a>${t.status === "verified" ? ' <span class="tag">✓ verified</span>' : ""}<small>${esc(`${t.base}, ${t.country}`)}</small></li>`).join("")}</ul></section>`;
    write("/teams/", page({ url: "/teams/", title: "Racing Team Profiles: Drivers, Bases & How to Support", desc: `Profiles of ${list.length} racing teams: base, drivers, season results and how fans can support them. Teams can add or claim their profile for free.`, h1: "Racing teams", crumbs: [{ name: "Teams", item: SITE + "/teams/" }], body, photo: ["none"], tick: ["Teams", "Drivers", "Support your team", "Add your team"] }));
  }

  { // Claim / add-a-team form. Saves to Supabase table team_claims (insert-only for visitors, see tools/sql/team_claims.sql);
    // if that fails, it opens an email to us with everything filled in so nothing is lost.
    const teamOpts = list.map(t => `<option value="${esc(t.id)}">${esc(t.name)} (${esc(sName(t.series[0]))})</option>`).join("");
    const seriesOpts = WORLD.series.map(x => `<option value="${esc(x.short || x.name)}"></option>`).join("");
    const f = (name, label, type = "text", extra = "", help = "") => `<label for="f_${name}">${label}${help ? `<small class="h">${help}</small>` : ""}</label><input id="f_${name}" name="${name}" type="${type}" ${extra}>`;
    const body = TEAMS_CSS + `<p class="answer">Add your team to Premier Racing Info, or claim the profile we already made for it. It's free. We check every submission with the team before it goes live, usually within a few days.</p>
<section class="card"><h2>What you get</h2><ul class="list"><li>A team page with your logo, photos and story, in your own words</li><li>Your socials, plus buttons for merch, sponsorship and donations so fans can support you</li><li>Your page linked from your series and race pages, written so it shows up in search</li><li>You stay in control: change or remove anything at any time by emailing us</li></ul></section>
<form class="cf" id="cf" novalidate>
<fieldset><legend>Your team</legend>
<label><span style="font-weight:600">Is your team already on the site?</span></label>
<label class="chk"><input type="radio" name="kind" value="claim"> Yes, I'm claiming an existing profile</label>
<label class="chk"><input type="radio" name="kind" value="new" checked> No, add a new team</label>
<div id="pickWrap" hidden><label for="f_team_id">Which team?</label><select id="f_team_id" name="team_id"><option value="">Choose…</option>${teamOpts}</select></div>
${f("team_name", "Team name", "text", 'required maxlength="120" autocomplete="organization"')}
${f("series", "Series or championship", "text", 'required maxlength="160" list="seriesList"', "Pick from the list or type your own, e.g. SCCA Spec Miata, 24 Hours of Lemons, Lucas Oil Late Models")}<datalist id="seriesList">${seriesOpts}</datalist>
<div class="two"><div>${f("city", "Home base (town or city)", "text", 'required maxlength="120"')}</div><div>${f("country", "Country", "text", 'required maxlength="80" autocomplete="country-name"')}</div></div>
${f("website", "Team website", "url", 'maxlength="300" placeholder="https://"')}
</fieldset>
<fieldset><legend>About you</legend>
<div class="two"><div>${f("contact_name", "Your name", "text", 'required maxlength="120" autocomplete="name"')}</div><div>${f("contact_role", "Your role on the team", "text", 'required maxlength="120"', "e.g. owner, team manager, driver, media")}</div></div>
${f("contact_email", "Team email", "email", 'required maxlength="200" autocomplete="email"', "Use your official team address if you have one. We'll email it to confirm.")}
${f("verify_handle", "Team's official Instagram or TikTok", "text", 'maxlength="120" placeholder="@yourteam"', "If you don't have a team email, we'll confirm by DM from this account instead.")}
</fieldset>
<fieldset><legend>Your profile</legend>
<label for="f_bio">Short story of your team<small class="h">Up to 600 characters, in your own words. Who you are, what you race, what you're proud of.</small></label><textarea id="f_bio" name="bio" maxlength="600"></textarea>
${f("drivers", "Drivers", "text", 'maxlength="300"', "Separate names with commas")}
${f("logo_link", "Logo", "url", 'maxlength="500" placeholder="https://"', "A share link (Google Drive, Dropbox, iCloud) to a PNG or SVG of your logo")}
${f("photos_link", "Photos", "url", 'maxlength="500" placeholder="https://"', "A share link to a folder of up to 10 photos. Only photos your team owns or has permission to share.")}
${f("photo_credit", "Photo credit", "text", 'maxlength="200"', "How each photographer should be credited, e.g. \"Jane Doe / @janedoeshoots\"")}
<div class="two"><div>${f("instagram", "Instagram link", "url", 'maxlength="300" placeholder="https://instagram.com/…"')}</div><div>${f("tiktok", "TikTok link", "url", 'maxlength="300" placeholder="https://tiktok.com/@…"')}</div><div>${f("youtube", "YouTube link", "url", 'maxlength="300" placeholder="https://youtube.com/@…"')}</div><div>${f("facebook", "Facebook or X link", "url", 'maxlength="300" placeholder="https://"')}</div></div>
</fieldset>
<fieldset><legend>Ways fans can support you</legend>
${f("merch", "Merch store", "url", 'maxlength="300" placeholder="https://"')}
${f("sponsor", "Sponsorship page or contact", "url", 'maxlength="300" placeholder="https://"')}
${f("donate", "Donations, Patreon or GoFundMe", "url", 'maxlength="300" placeholder="https://"')}
</fieldset>
<fieldset><legend>Permission</legend>
<label class="chk"><input type="checkbox" name="ok_authorized" required> <span>I'm part of this team and allowed to speak for it.</span></label>
<label class="chk"><input type="checkbox" name="ok_own" required> <span>The team owns everything we're sending (logo, photos, text), or has the photographer's permission to share it.</span></label>
<label class="chk"><input type="checkbox" name="ok_license" required> <span>We give Premier Racing Info free, non-exclusive permission to show this content, resized or cropped to fit, on its website, app and social accounts to promote our team. We keep ownership of it and can ask for any of it to be changed or removed at any time by emailing ${CONTACT}. See the <a href="/terms/#teams">terms</a>.</span></label>
<label class="chk"><input type="checkbox" name="ok_contact"> <span>You can contact us about our profile and occasional updates for teams (optional).</span></label>
<p class="err" id="cfErr" role="alert"></p>
<button class="btn p" type="submit" id="cfBtn">Send for review</button>
</fieldset>
</form>
<section class="card" id="cfDone" tabindex="-1"><h2>Thanks, we've got it</h2><p>We'll confirm with your team by email or a DM from your official account, then build your page. If you need to change anything in the meantime, email <a href="mailto:${CONTACT}">${CONTACT}</a>.</p><p><a class="btn" href="/teams/">See all teams</a></p></section>
<script>(function(){
var SB="${SB_URL}",KEY="${SB_KEY}",TO="${CONTACT}";
var form=document.getElementById("cf"),err=document.getElementById("cfErr"),btn=document.getElementById("cfBtn"),pick=document.getElementById("pickWrap"),sel=document.getElementById("f_team_id");
var names={${list.map(t => `${JSON.stringify(t.id)}:[${JSON.stringify(t.name)},${JSON.stringify(sName(t.series[0]))},${JSON.stringify(t.base)},${JSON.stringify(t.country)}]`).join(",")}};
function setKind(k){form.kind.value=k;pick.hidden=k!=="claim";}
form.addEventListener("change",function(e){if(e.target.name==="kind")setKind(e.target.value);if(e.target===sel&&names[sel.value]){var n=names[sel.value];form.team_name.value=n[0];form.series.value=n[1];form.city.value=n[2];form.country.value=n[3];}});
var q=new URLSearchParams(location.search).get("team");if(q&&names[q]){setKind("claim");sel.value=q;sel.dispatchEvent(new Event("change",{bubbles:true}));}
function ev(n,p){try{window.gtag&&gtag("event",n,p||{})}catch(e){}}
ev("team_claim_open",{team:q||""});
form.addEventListener("submit",function(e){e.preventDefault();err.textContent="";
  var bad=[].slice.call(form.querySelectorAll("[required]")).filter(function(x){return x.type==="checkbox"?!x.checked:!x.value.trim()||!x.checkValidity();});
  [].slice.call(form.querySelectorAll("input[type=url]")).forEach(function(x){if(x.value&&!/^https?:\\/\\//.test(x.value))bad.push(x);});
  if(bad.length){err.textContent="Please fill in or fix: "+bad.map(function(x){var l=form.querySelector('label[for="'+x.id+'"]');return x.type==="checkbox"?"the permission boxes":(l?l.firstChild.textContent.trim():x.name);}).filter(function(v,i,a){return a.indexOf(v)===i}).join(", ")+".";bad[0].focus();return;}
  var d={};new FormData(form).forEach(function(v,k){d[k]=typeof v==="string"?v.trim():v;});
  ["ok_authorized","ok_own","ok_license","ok_contact"].forEach(function(k){d[k]=!!form[k].checked;});
  d.team_id=d.kind==="claim"?d.team_id||null:null;d.page=location.href;d.license_version="${today}";
  btn.disabled=true;btn.textContent="Sending…";
  function done(){form.style.display="none";var x=document.getElementById("cfDone");x.style.display="block";x.focus();ev("team_claim_submit",{kind:d.kind,team:d.team_id||""});}
  function mail(){var lines=Object.keys(d).map(function(k){return k+": "+d[k];});location.href="mailto:"+TO+"?subject="+encodeURIComponent("Team profile: "+d.team_name)+"&body="+encodeURIComponent(lines.join("\\n"));done();}
  if(!SB){mail();return;}
  fetch(SB+"/rest/v1/team_claims",{method:"POST",headers:{apikey:KEY,authorization:"Bearer "+KEY,"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(d)}).then(function(r){if(r.ok)done();else mail();}).catch(mail);
});
})();</script>`;
    write("/teams/claim/", page({ url: "/teams/claim/", title: "Add or Claim Your Team Profile – Premier Racing Info", desc: "Race teams: get a free profile on Premier Racing Info with your logo, photos, story, socials and links for fans to support you. Club, grassroots and pro teams welcome.", h1: "Add your team", crumbs: [{ name: "Teams", item: SITE + "/teams/" }, { name: "Add your team", item: SITE + "/teams/claim/" }], body, photo: ["none"], tick: ["Add your team", "Free team profile", "Photos", "Merch", "Sponsors", "Fans"] }));
  }
}

// ---- About, Privacy, 404 ----
write("/about/", page({ url: "/about/", title: "About Premier Racing Info: Who We Are & How We Check Data", desc: "Premier Racing Info is a free, independent fan site and app for following racing: start times in your time zone, how to watch, tickets, standings, alerts and a picks game.", h1: "About Premier Racing Info", crumbs: [{ name: "About", item: SITE + "/about/" }],
  body: `<p class="answer">Premier Racing Info is a free, independent guide to ${N_ALL} racing series: session start times for ${N_APP} top series in your own time zone, race dates for ${N_DATES} more, where to watch in the US, tickets near you, and standings, all in one place.</p>
  <section class="card"><h2>Who runs it</h2><p>It's built and run by an independent motorsport fan and sim racer in San Antonio, Texas. It started as a way for a few friends to keep up with F1, IMSA and WEC race weekends without doing time-zone math, and grew into a free app and site covering ${WORLD.series.length} series worldwide.</p></section>
  <section class="card"><h2>What you get</h2><ul class="list"><li>Session start times converted to your own time zone</li><li>Where to watch every series in the US, with free options marked</li><li>Ticket links to the official seller for each race, and races near you by country and state</li><li>Results and championship standings for 21 series</li><li>Lock-screen race alerts, news and a season-long picks game with friends</li></ul></section>
  <section class="card"><h2>How the information is checked</h2><p>Calendars, session times and TV listings come from the official series, circuit and broadcaster sites. Standings are updated after each round and dated on the page; series facts list the date they were checked and a source. News headlines link to the original publishers. Photos are free-licensed from Wikimedia Commons and credited, or used with the photographer's permission.</p></section>
  <section class="card"><h2>Independence</h2><p>It isn't affiliated with any series, team, circuit or broadcaster. Series and team names belong to their owners. Dates can change, so confirm with the official site before you travel. See the <a href="/terms/">terms</a> and <a href="/privacy/">privacy policy</a>.</p></section>
  <section class="card"><h2>Contact</h2><p>Questions, corrections or ideas: <a href="mailto:${CONTACT}">${CONTACT}</a></p></section><p><a class="btn p" href="/">Open the app ›</a></p>` }));
write("/privacy/", page({ url: "/privacy/", title: "Privacy Policy – Premier Racing Info", desc: "What Premier Racing Info stores, why, and how to delete it.", h1: "Privacy policy", crumbs: [{ name: "Privacy", item: SITE + "/privacy/" }],
  body: `<section class="card"><p><b>Last updated:</b> ${today}</p>
  <h2>What we store</h2><ul>
  <li><b>On your device:</b> your favorites, starred series, races marked Going/Watched, time zone and settings, saved in your browser so the app remembers them.</li>
  <li><b>If you create an account:</b> your email address, display name, those same preferences, your prediction picks, and the profile photo and bio you add (only you can see your photo and bio). Picks and display names are visible to other signed-in players on the leaderboard.</li>
  <li><b>If you send a team profile:</b> your name, role, email, the team details and links you enter, and the date you agreed to the team terms. We use these to confirm the team, build its page and contact you about it. Your name and email are never shown on the site. Ask us at any time to delete them.</li>
  <li><b>If you turn on alerts:</b> a push address from your browser and which series and alert types you chose, so we can send notifications. Turning alerts off deletes it.</li></ul>
  <h2>What we don't do</h2><p>We don't sell your data, and we don't use it for advertising. We don't ask for your location; times use your phone's time zone setting.</p>
  <h2>Visit statistics</h2><p>We use Google Analytics and Cloudflare Web Analytics to count visits and see which pages people use. Google Analytics sets cookies and receives your browser type, approximate location from your IP address, and the pages you view; it doesn't receive your email, picks or favorites. You can opt out with Google's <a href="https://tools.google.com/dlpage/gaoptout">browser add-on</a> or by blocking cookies for this site. Cloudflare's counter uses no cookies. Visitors in the UK, EU and Switzerland are asked first, and Google Analytics stays off unless they say yes. Nothing on this site is used for advertising.</p>
  <h2>Services we use</h2><p>Hosting by GitHub Pages; accounts, picks and alert settings stored with Supabase; photos loaded from Wikimedia Commons and, as a backup, openly licensed archives such as Flickr through Openverse; news headlines link to the original publishers. Links to tickets, streaming services and official sites take you to those companies' sites, which have their own policies.${""}</p>
  <h2 id="delete">Your choices</h2><p>You can sign out, turn alerts off, or clear the app's data in your browser at any time. To delete your account and everything linked to it, email <a href="mailto:${CONTACT}">${CONTACT}</a> from the address you signed up with.</p>
  <h2>Changes</h2><p>If this policy changes, the date above will change too.</p></section>` }));
write("/terms/", page({ url: "/terms/", title: "Terms of Use – Premier Racing Info", desc: "The rules for using Premier Racing Info, plus trademark, photo and link notices.", h1: "Terms of use", crumbs: [{ name: "Terms", item: SITE + "/terms/" }],
  body: `<section class="card"><p><b>Last updated:</b> ${today}</p>
  <h2>Who we are</h2><p>Premier Racing Info is an independent fan site. It is not affiliated with, endorsed by or sponsored by Formula 1, the FIA, IMSA, the ACO, SRO, NASCAR, IndyCar, Dorna or any other series, team, circuit, broadcaster or ticket seller.</p>
  <h2>Trademarks</h2><p>Series, team, event and broadcaster names are trademarks of their owners. We use them only to say which race or series we mean. The series badges on this site are our own simple labels, not official logos.</p>
  <h2>Times, dates and results</h2><p>We work hard to keep schedules, TV listings, standings and ticket links correct, but they change, and we can make mistakes. Check the official series or circuit site before you travel or buy anything. The site is provided as is, without any warranty.</p>
  <h2>Links, tickets and news</h2><p>Links to tickets, streaming services, news stories and official sites take you to other companies, which have their own terms. We don't sell tickets and aren't responsible for purchases you make elsewhere. News headlines link to the original publisher. If we ever earn a commission from a link, we'll say so next to it.</p>
  <h2>Photos</h2><p>Photos are used under free licences from Wikimedia Commons (or, as a backup, Flickr and other archives through Openverse), credited to their photographers, or with the photographer's permission. The full list is under Photo credits in the app. If you own a photo on this site and want it credited differently or removed, email <a href="mailto:${CONTACT}">${CONTACT}</a> and we'll act on it promptly.</p>
  <h2 id="teams">Team profiles</h2><p>Team pages that say "Unclaimed" list only public facts, such as the team's name, series, base, drivers and results. They don't use team logos or photos and don't mean the team is involved with this site. A team can add or claim its profile through <a href="/teams/claim/">the team form</a>. When a team sends us its logo, photos, text or links, the person sending them confirms they're allowed to speak for the team and that the team owns the content or has permission to share it. The team keeps ownership and gives us free, non-exclusive permission to show that content, resized or cropped to fit, on this site, in the app and on our social accounts to promote the team. A team can ask us to change or remove any of it, or its whole profile, at any time by emailing <a href="mailto:${CONTACT}">${CONTACT}</a>, and we'll do it promptly. "Support" links on team pages go to the team's own stores and pages; we don't handle those payments.</p>
  <h2>Accounts and picks</h2><p>Keep your account details to yourself and be decent in display names. We can remove names or accounts that are abusive. The picks game is just for fun: there are no prizes or entry fees.</p>
  <h2>Changes</h2><p>If these terms change, the date above will change too. See also our <a href="/privacy/">privacy policy</a>.</p></section>` }));
fs.writeFileSync(path.join(root, "404.html"), page({ url: "/404.html", title: "Page not found – Premier Racing Info", desc: "This page doesn't exist.", h1: "Page not found",
  body: `<section class="card"><p>That page doesn't exist, or the race may have moved. Try one of these:</p><div class="btns"><a class="btn p" href="/">Open the app</a><a class="btn" href="/calendar/">Race calendar</a><a class="btn" href="/series/">All series</a><a class="btn" href="/tickets/">Tickets</a></div></section>` }).replace('<link rel="canonical" href="https://premierracinginfo.com/404.html">', '<meta name="robots" content="noindex">'));

// ---- Photo header script for these pages: the app's own race-photo code (same searches, rules and cache) ----
{
  const app = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const block = app.slice(app.indexOf("const PHOTO_QUERIES = {"), app.indexOf("// Hero slideshow:"));
  if (!block.includes("function loadFreePhotos")) throw new Error("photo code not found in index.html");
  const js = `// Generated by tools/build-pages.mjs from index.html. Photo header + scroll ticker for guide pages.
(function(){
var KEY = "raceweekends-2026", OWN_PHOTOS = [];
${block}
var hero = document.querySelector(".ph-hero"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
var want = hero ? (hero.dataset.w || "").split(",").filter(Boolean) : [];
if (hero && want[0] !== "none") loadFreePhotos().then(function(){
  // a page whose series has no photos yet fetches them now (then they're cached for every page)
  var missing = want.filter(function(w){ return !PHOTO_POOL.some(function(x){ return x.tags[0] === w; }); });
  return missing.length ? Promise.all(missing.map(seriesPhotos)) : null;
}).then(function(){
  var h = 0;
  for (var i = 0; i < location.pathname.length; i++) h = (h * 31 + location.pathname.charCodeAt(i)) >>> 0;
  var fams = want.map(function(w){ return PHOTO_FAMILY[w]; }).filter(Boolean);
  // only this page's series (or its close family); general pages may use any race photo
  var mine = PHOTO_POOL.filter(function(x){ return want.indexOf(x.tags[0]) >= 0; });
  var fam = PHOTO_POOL.filter(function(x){ return want.indexOf(x.tags[0]) < 0 && fams.indexOf(PHOTO_FAMILY[x.tags[0]]) >= 0; });
  var pool = want.length ? mine.concat(fam) : PHOTO_POOL.slice();
  if (!pool.length) return;
  var k = h % pool.length; pool = pool.slice(k).concat(pool.slice(0, k)).slice(0, 14);
  var layers = hero.querySelectorAll(".ph-l"), cr = document.querySelector(".ph-credit"), idx = 0, cur = 0, timer = 0, paused = false;
  function show(i){ var x = pool[i % pool.length], img = new Image(); img.onload = function(){ var next = layers[cur ^ 1]; next.style.backgroundImage = 'url("' + x.img.replace(/"/g, "%22") + '")'; next.classList.add("on"); layers[cur].classList.remove("on"); cur ^= 1;
    if (cr) cr.innerHTML = '<a href="' + esc(x.page) + '" target="_blank" rel="noopener">' + esc(photoCredit(x)) + "</a>"; }; img.src = x.img; }
  function start(){ clearInterval(timer); if (pool.length < 2 || paused || reduce) return; timer = setInterval(function(){ if (!document.hidden) show(++idx); }, 7000); }
  show(0); start();
  if (pool.length > 1 && !reduce) { hero.insertAdjacentHTML("beforeend", '<button class="ph-pause" type="button" aria-label="Pause photos" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="ps" d="M8 5h3v14H8zM13 5h3v14h-3z"/><path class="pl" d="M8 5l11 7-11 7z"/></svg></button>');
    var b = hero.querySelector(".ph-pause"); b.addEventListener("click", function(){ paused = !paused; b.setAttribute("aria-pressed", paused); b.setAttribute("aria-label", paused ? "Play photos" : "Pause photos"); paused ? clearInterval(timer) : start(); });
    hero.addEventListener("mouseenter", function(){ clearInterval(timer); }); hero.addEventListener("mouseleave", start); }
});
if (!reduce) { var tick = false; function onScroll(){ if (tick) return; tick = true; requestAnimationFrame(function(){ tick = false; var y = scrollY;
  document.querySelectorAll(".ph-row").forEach(function(r){ var t = r.firstElementChild, w = t.scrollWidth / 4 || 1, d = +r.dataset.dir; var x = ((y * .6 * d) % w + w) % w; t.style.transform = "translate3d(" + (-x) + "px,0,0)"; });
  if (hero) { var bb = hero.getBoundingClientRect(); if (bb.bottom > 0) { hero.querySelector(".ph-copy").style.transform = "translate3d(0," + (Math.min(0, bb.top) * -.25) + "px,0)"; hero.querySelector(".ph-media").style.transform = "translate3d(0," + (Math.min(0, bb.top) * -.3) + "px,0)"; } } }); }
  addEventListener("scroll", onScroll, { passive: true }); onScroll(); }
})();
`;
  fs.writeFileSync(path.join(root, "hero.js"), js);
}

// ---- llms.txt: a plain map of the site for AI crawlers (GEO) ----
{
  const upcoming = EV.filter(e => e.end >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 12);
  fs.writeFileSync(path.join(root, "llms.txt"), `# Premier Racing Info

> Free, independent motorsport guide: race start times in your time zone, where to watch in the US, tickets and standings for ${N_ALL} racing series, with full session times for ${N_APP} of them (F1, NASCAR, IndyCar, MotoGP, IMSA, WEC, GT World Challenge and more). Updated ${today}.

## Main guides
- [Racing calendar](${SITE}/calendar/): every upcoming race with dates and start times
- [How to watch racing in the US](${SITE}/watch/): streaming and TV for every series, free options marked
- [Race tickets](${SITE}/tickets/): official sellers for every upcoming race
- [Races near you](${SITE}/races-in/): races by region, country and US state
- [All series](${SITE}/series/): champions, standings and how to watch for ${WORLD.series.length} series
- [Tracks](${SITE}/tracks/): every circuit and what races there
- [2026 seasons in review](${SITE}/recap/): champions, most wins and every race winner per series
- [eSports](${SITE}/esports/): sim racing championships (F1 Sim Racing, eNASCAR, Porsche Esports Supercup, Gran Turismo World Series), upcoming events and the official games
- [About](${SITE}/about/): who runs the site and how data is checked

## Next races
${upcoming.map(e => `- [${SERIES_FULL[e.s]} ${e.name} ${e.year}](${SITE}/races/${e.slug}/): ${range(e.start, e.end)}, ${e.circuit}`).join("\n")}

## Notes
- Times on race pages are given in US Central time in the HTML and converted to the reader's time zone in the browser.
- Not affiliated with any series, team, circuit or broadcaster.
`);
}

// ---- eSports guide (data: ESPORTS in index.html) ----
{
  const { ESPORTS: ES } = data;
  const evs = ES.events.map(([id, name, sim, venue, s, e, about, link, pro]) => ({ id, name, sim, venue, s, e, about, link, pro })).filter(x => x.e >= today).sort((a, b) => a.s.localeCompare(b.s));
  const done = ES.series.filter(x => x.champs.length), live = ES.series.filter(x => x.status === "In progress");
  const wName = id => { const w = WORLD.series.find(x => x.id === id); return w ? (w.short || w.name) : id; };
  const champLine = x => `${x.champs[0][1]}${x.champs[0][2] ? ` (${x.champs[0][2].split(" · ")[0]})` : ""}`;
  const answer = `Sim racing in ${today.slice(0, 4)}: ${listAnd(done.map(x => `${champLine(x)} won the ${x.name}`))}.${evs[0] ? ` Next up: ${evs[0].name} (${evs[0].sim}), ${range(evs[0].s, evs[0].e)}.` : ""}`;
  let body = `<p class="lede">${esc(answer)}</p>`;
  body += `<section class="card"><h2>Coming up</h2>${evs.length ? `<table><tr><th>Dates</th><th>Event</th><th>Game</th></tr>${evs.map(x => `<tr><td>${range(x.s, x.e)}</td><td><a href="${esc(x.link)}" rel="noopener">${esc(x.name)}</a>${x.pro ? ' <span class="tag">pro final</span>' : ""}<br><small>${esc([x.venue, x.about].filter(Boolean).join(" · "))}</small></td><td>${esc(x.sim)}</td></tr>`).join("")}</table>` : "<p>No events listed right now.</p>"}</section>`;
  for (const x of ES.series) body += `<section class="card"><h2>${esc(x.name)}</h2><p>${esc(x.sim)} · ${esc(x.season)} · ${esc(x.status)}</p><p>${esc(x.about)}</p>${x.champs.length ? `<ul>${x.champs.map(c => `<li><strong>${esc(c[0])}:</strong> ${esc(c[1])}${c[2] ? `, ${esc(c[2])}` : ""}</li>`).join("")}</ul>` : ""}${x.note || x.next ? `<p>${esc([x.note, x.next].filter(Boolean).join(" "))}</p>` : ""}<p>${x.watch.map(w => `<a class="btn" href="${esc(w[1])}" rel="noopener">${esc(w[0])}</a>`).join("")}<a class="btn" href="${esc(x.site)}" rel="noopener">Official site</a>${x.real ? `<a class="btn" href="/series/${esc(x.real)}/">Real ${esc(wName(x.real))}</a>` : ""}</p></section>`;
  body += `<section class="card"><h2>Race it yourself: the official games</h2><ul>${ES.games.map(([g, by, about, real, link]) => `<li><a href="${esc(link)}" rel="noopener"><strong>${esc(g)}</strong></a> (${esc(by)}): ${esc(about)}${real.length ? ` Real series: ${real.map(r => `<a href="/series/${esc(r)}/">${esc(wName(r))}</a>`).join(", ")}.` : ""}</li>`).join("")}</ul><p>${esc(ES.off)}</p></section>`;
  const qa = [];
  for (const x of done) qa.push([`Who won the ${today.slice(0, 4)} ${x.name}?`, `${esc(champLine(x))}.${x.champs[1] ? ` ${esc(x.champs[1][1])} won the ${esc(x.champs[1][0].toLowerCase())} title.` : ""} ${esc(x.note || "")}`.trim()]);
  for (const x of live) { const fin = evs.find(e => e.pro && e.name.startsWith(x.name.split(" ").slice(0, 2).join(" "))); if (fin) qa.push([`When are the ${x.name} finals?`, `${esc(fin.name)}: ${range(fin.s, fin.e)} in ${esc(fin.venue)}.`]); }
  for (const [g, , about, real] of ES.games.filter(g => g[3].length)) qa.push([`What is ${g}?`, esc(about)]);
  body += faqHTML(qa);
  write("/esports/", page({ url: "/esports/", appLink: "/#esports", title: fitTitle(`Sim Racing eSports ${today.slice(0, 4)}: Champions & Schedule`, "Sim Racing eSports: Champions & Schedule"), desc: `${answer} Plus the official games of F1, NASCAR, WEC and GT World Challenge.`, h1: "eSports: sim racing", crumbs: [{ name: "eSports", item: SITE + "/esports/" }], jsonld: faqLD(qa), body, tick: ["eSports", "Sim racing", "F1 Sim Racing", "eNASCAR", "Porsche Esports Supercup", "Gran Turismo World Series", "iRacing"] }));
}
// ---- Homepage: crawlable summary inside the app shell (replaced by the live app when JavaScript runs) ----
{
  const ix = path.join(root, "index.html"); let app = fs.readFileSync(ix, "utf8");
  const up = EV.filter(e => e.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  const wk = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), now = up.filter(e => e.start <= wk), next = up.filter(e => e.start > wk).slice(0, 8);
  const line = e => { const m = (SESSIONS[e.id] || []).filter(x => !x[2]).slice(-1)[0]; return `<li><a href="/races/${e.slug}/">${esc(SERIES_FULL[e.s])}: ${esc(e.name)}</a> · ${esc(e.circuit)} · ${range(e.start, e.end)}${m ? ` · race starts ${fDay.format(new Date(m[1]))} at ${fTime.format(new Date(m[1]))}` : ""}</li>`; };
  const html = `<!--seo--><div class="seo-static"><h2>Race start times in your time zone</h2><p>Premier Racing Info is a free guide to ${N_ALL} racing series: every session start time for ${N_APP} top series in your own time zone, race dates for ${N_DATES} more, where to watch in the US, tickets and standings.</p>${now.length ? `<h2>Racing this week</h2><ul>${now.map(line).join("")}</ul>` : ""}<h2>Coming up</h2><ul>${next.map(line).join("")}</ul><p><a href="/calendar/">Full racing calendar</a> · <a href="/watch/">How to watch in the US</a> · <a href="/tickets/">Tickets</a> · <a href="/races-in/">Races near you</a> · <a href="/series/">All series</a> · <a href="/esports/">eSports</a> · <a href="/about/">About</a></p><p>Updated ${fUpd.format(new Date(today))}.</p></div><!--/seo-->`;
  app = app.includes("<!--seo-->") ? app.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, html) : app.replace('<div id="weekendTop"></div>', `<div id="weekendTop">${html}</div>`);
  fs.writeFileSync(ix, app);
}

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
