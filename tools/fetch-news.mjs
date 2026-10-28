// Collects the latest racing headlines from public RSS feeds and writes news.json.
// Run by GitHub Actions every 30 minutes (.github/workflows/news.yml). No dependencies; Node 18+.
// Only headlines, links, times and thumbnails are stored. Tapping a story opens the original article.
import fs from "node:fs";

// [source name, feed URL, series ids every story in this feed is about]
const FEEDS = [
  ["Formula1.com", "https://www.formula1.com/en/latest/all.xml", ["f1"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/f1/news/", ["f1"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/indycar/news/", ["indycar"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/nascar-cup/news/", ["nascar-cup"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/wec/news/", ["wec"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/imsa/news/", ["imsa"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/motogp/news/", ["motogp"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/wrc/news/", ["wrc"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/formula-e/news/", ["formulae"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/supercars/news/", ["supercars"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/dtm/news/", ["dtm"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/super-gt/news/", ["supergt"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/wsbk/news/", ["wsbk"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/btcc/news/", ["btcc"]],
  ["Motorsport.com", "https://www.motorsport.com/rss/all/news/", []],
  ["Autosport", "https://www.autosport.com/rss/all/news/", []],
  ["RACER", "https://racer.com/feed/", []],
  ["Sportscar365", "https://sportscar365.com/feed/", []],
  ["DirtFish", "https://dirtfish.com/feed/", []],
  ["Crash.net", "https://www.crash.net/rss/motogp", ["motogp"]],
];

// Keyword tagging for general feeds (and extra tags for series feeds). Order doesn't matter; a story can have several tags.
const RULES = [
  ["f1", /\bF1\b(?! Academy)|Formula 1|Formula One|Grand Prix(?! motorcycle)/i, /MotoGP|Moto2|Moto3|motorcycle/i],
  ["f2", /\bF2\b|Formula 2\b/i], ["f3", /\bF3\b|Formula 3\b/i], ["f1academy", /F1 Academy/i],
  ["indycar", /IndyCar|Indy 500|Indianapolis 500/i], ["indynxt", /Indy NXT/i],
  ["usfpro2000", /USF Pro 2000/i], ["usf2000", /USF2000/i],
  ["superformula", /Super Formula(?! Lights)/i], ["sflights", /Super Formula Lights/i],
  ["formulae", /Formula E\b|E-Prix/i], ["freca", /Formula Regional Europe|FRECA/i], ["framericas", /Formula Regional Americas/i],
  ["euroformula", /Euroformula/i], ["gb3", /\bGB3\b/], ["f4us", /F4 U\.?S/i], ["italianf4", /Italian F4/i], ["eurocup3", /Eurocup-3/i],
  ["wec", /\bWEC\b|World Endurance|Le Mans 24|24 Hours of Le Mans|Hypercar/i], ["imsa", /\bIMSA\b|WeatherTech|Rolex 24|Petit Le Mans|Sebring 12/i],
  ["mpc", /Pilot Challenge/i], ["vpsc", /VP Racing SportsCar Challenge/i], ["elms", /European Le Mans|\bELMS\b/i], ["alms", /Asian Le Mans/i], ["lmc", /Le Mans Cup/i],
  ["igtc", /Intercontinental GT|\bIGTC\b|Bathurst 12/i], ["dtm", /\bDTM\b/], ["supergt", /Super GT/i], ["adacgtm", /GT Masters/i], ["britgt", /British GT/i],
  ["nls", /\bNLS\b|Nürburgring Langstrecken|Nurburgring Langstrecken/i], ["24h", /24H Series/i], ["gt4am", /GT4 America/i], ["gtam", /GT America\b/i], ["gt4eu", /GT4 European/i],
  ["stai", /Super Taikyu/i], ["fchna", /Ferrari Challenge/i], ["lstna", /Super Trofeo/i], ["grcup", /GR Cup/i],
  ["gtwc-america", /GT World Challenge America/i], ["gtwc-europe", /GT World Challenge Europe|Spa 24 Hours|24 Hours of Spa/i], ["gtwc-asia", /GT World Challenge Asia/i], ["gtwc-australia", /GT World Challenge Australia/i],
  ["porsche-supercup", /Supercup/i], ["carrera-cup-na", /Carrera Cup North America/i], ["mustang-challenge", /Mustang Challenge/i],
  ["pccd", /Carrera Cup Deutschland|Carrera Cup Germany/i], ["pccgb", /Carrera Cup GB|Carrera Cup Great Britain/i], ["pccau", /Carrera Cup Australia/i], ["pccas", /Carrera Cup Asia/i],
  ["nascar-cup", /NASCAR Cup|Cup Series|\bNASCAR\b(?!.*(Truck|O'Reilly|Xfinity|Euro|Brasil|Mexico|ARCA))/i], ["nascar-oreilly", /O'Reilly Auto Parts Series|O’Reilly Auto Parts Series|Xfinity Series/i],
  ["nascar-truck", /Truck Series/i], ["arca", /\bARCA\b/], ["nascar-euro", /NASCAR Euro|EuroNASCAR/i], ["nascar-brasil", /NASCAR Brasil/i], ["nascar-mexico", /NASCAR Mexico/i],
  ["supercars", /Supercars|Bathurst 1000/i], ["btcc", /\bBTCC\b|British Touring Car/i], ["tcr-world-tour", /TCR World Tour/i], ["tcr-europe", /TCR Europe/i],
  ["stock-car-pro", /Stock Car Pro/i], ["turismo-carretera", /Turismo Carretera/i], ["tc2000", /\bTC2000\b/i],
  ["wrc", /\bWRC\b|World Rally Championship|Rally1/i], ["erc", /European Rally Championship|\bERC\b/], ["ara", /American Rally Association|\bARA\b/],
  ["w2rc", /Dakar|Rally-Raid|W2RC/i], ["nhra", /\bNHRA\b|Top Fuel|Funny Car/i], ["fd", /Formula Drift|Formula DRIFT/i], ["dm", /Drift Masters/i],
  ["ppihc", /Pikes Peak/i], ["score", /Baja 1000|Baja 500|SCORE International/i], ["ultra4", /King of the Hammers|Ultra4/i],
  ["woo", /World of Outlaws/i], ["highlimit", /High Limit/i], ["sst", /Stadium Super Trucks/i], ["lemons", /24 Hours of Lemons|LeMons/i],
  ["motogp", /MotoGP/i], ["moto2", /Moto2/i], ["moto3", /Moto3/i], ["wsbk", /WorldSBK|World Superbike|\bWSBK\b/i], ["wssp", /WorldSSP|World Supersport/i],
  ["motoamerica", /MotoAmerica/i], ["bsb", /\bBSB\b|British Superbike/i], ["ewc", /Endurance World Championship|Suzuka 8 Hours|Bol d'Or/i], ["iomtt", /Isle of Man TT|\bTT Races\b/i],
  ["supercross", /Supercross/i], ["promotocross", /Pro Motocross/i], ["smx", /SuperMotocross|\bSMX\b/], ["mxgp", /\bMXGP\b|MX2/], ["speedway", /Speedway GP|Speedway Grand Prix/i],
  ["aft", /American Flat Track|\bAFT\b/], ["kotb", /King of the Baggers/i],
];

const decode = s => String(s || "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i")); return m ? m[1] : ""; };
const attr = (xml, name, a) => { const m = xml.match(new RegExp(`<${name}\\b[^>]*\\b${a}=["']([^"']+)["']`, "i")); return m ? m[1] : ""; };

function parse(xml){
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.map(b => {
    const title = decode(tag(b, "title"));
    let link = decode(tag(b, "link")) || attr(b, "link", "href");
    const date = decode(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date"));
    const raw = tag(b, "description") + " " + tag(b, "content:encoded") + " " + tag(b, "content");
    let img = attr(b, "media:content", "url") || attr(b, "media:thumbnail", "url") ||
      (/<enclosure\b[^>]*type=["']image/i.test(b) ? attr(b, "enclosure", "url") : "") ||
      ((raw.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').match(/<img\b[^>]*src=["']([^"']+)["']/i) || [])[1] || "");
    const cats = (b.match(/<category\b[^>]*>([\s\S]*?)<\/category>/gi) || []).map(c => decode(c)).join(" ");
    return { title, link: link.trim(), date, img: img.replace(/&amp;/g, "&"), cats };
  }).filter(x => x.title && /^https?:\/\//.test(x.link));
}

function tagsFor(text, base){
  const t = new Set(base);
  for (const [id, re, not] of RULES) if (re.test(text) && !(not && not.test(text))) t.add(id);
  if (t.has("moto2") || t.has("moto3")) t.delete("f1");
  if (t.has("nascar-oreilly") || t.has("nascar-truck")) { if (!/Cup Series/i.test(text)) t.delete("nascar-cup"); }
  return [...t];
}

const now = Date.now(), keepMs = 10 * 86400000;
const seen = new Set(), items = [], report = [];
await Promise.all(FEEDS.map(async ([source, url, base]) => {
  try {
    const r = await fetch(url, { headers: { "user-agent": "PremierRacingInfo/1.0 (+https://github.com/phoenixjayhernandez-max/premier-racing-info)", accept: "application/rss+xml, application/xml, text/xml, */*" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const list = parse(await r.text());
    report.push(`${source} ${url}: ${list.length}`);
    for (const x of list) {
      const t = Date.parse(x.date); if (!t || now - t > keepMs || t - now > 3600000) continue;
      items.push({ source, title: x.title, link: x.link, time: new Date(t).toISOString(), img: /^https:\/\//.test(x.img) ? x.img : "", tags: tagsFor(x.title + " " + x.cats + " " + url, base) });
    }
  } catch (e) { report.push(`${source} ${url}: FAILED ${e.message}`); }
}));

items.sort((a, b) => b.time.localeCompare(a.time));
const out = [];
for (const x of items) {
  const key = x.link.replace(/[?#].*$/, "").replace(/\/$/, "");
  const tkey = x.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
  if (seen.has(key) || seen.has(tkey)) {
    const prev = out.find(o => o.link.replace(/[?#].*$/, "").replace(/\/$/, "") === key || o.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60) === tkey);
    if (prev) { prev.tags = [...new Set(prev.tags.concat(x.tags))]; if (!prev.img && x.img) prev.img = x.img; }
    continue;
  }
  seen.add(key); seen.add(tkey);
  out.push(x);
  if (out.length >= 300) break;
}
for (const line of report.sort()) console.log(line);
if (!out.length) { console.log("No stories fetched; keeping the old news.json"); process.exit(0); }
const old = fs.existsSync("news.json") ? JSON.parse(fs.readFileSync("news.json", "utf8")) : null;
if (old && JSON.stringify(old.items) === JSON.stringify(out)) { console.log("No new stories"); process.exit(0); }
fs.writeFileSync("news.json", JSON.stringify({ updated: new Date().toISOString(), items: out }));
console.log(`news.json written: ${out.length} stories`);
