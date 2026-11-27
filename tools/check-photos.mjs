// Photo audit: runs the site's own photo searches and filters (copied live from index.html) for every series
// and writes PHOTOS.md: every photo each series can show, with its title and categories, plus what got rejected and why.
// Run: node tools/check-photos.mjs            (all series; needs internet access to Wikimedia Commons)
//      node tools/check-photos.mjs nascar-cup (one series)
//      node tools/check-photos.mjs --selftest (only check that known bad photos are rejected; no internet needed)
// Read PHOTOS.md and add a rule in index.html (photoFits) for anything that isn't that series' race cars on track.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const start = html.indexOf("const OWN_PHOTOS = ["), end = html.indexOf("const photoInflight = {};");
if (start < 0 || end < 0) throw new Error("Couldn't find the photo code in index.html");
const w = {}; Function("window", fs.readFileSync(path.join(root, "world.js"), "utf8"))(w);
const WORLD_LIST = w.WORLD.series;
class DOMParser { parseFromString(h){ const t = String(h).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'"); return { body: { textContent: t } }; } }
const store = {}; const localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } };
const P = Function("KEY", "localStorage", "DOMParser", "WORLD_LIST", "worldById",
  html.slice(start, end) + ";return { PHOTO_NOT, PHOTO_YES, PHOTO_PEOPLE, PHOTO_GOV, PHOTO_NAME_DATE, PHOTO_ONTRACK, photoFits, queriesFor, isFresh };")
  ("raceweekends-2026", localStorage, DOMParser, WORLD_LIST, id => WORLD_LIST.find(x => x.id === id));

// Self-test: photos that must never pass, and ones that must
const MUST_FAIL = [
  ["nascar-cup", "A.C. Cordoza - September 14, 2023", "NASCAR Cup Series 2023 · Richmond Raceway · Glenn Youngkin"],
  ["nascar-cup", "Governor Glenn Youngkin attends the NASCAR Cup Series race at Martinsville", "NASCAR Cup Series · Martinsville Speedway"],
  ["nascar-cup", "Richmond Raceway 2023", "NASCAR Cup Series 2023 · Office of the Governor of Virginia"],
  ["f1", "Lando Norris at the Melbourne Walk during the 2026 Australian Grand Prix", "Formula One 2026"],
];
const MUST_PASS = [
  ["nascar-cup", "Kyle Larson No. 5 Chevrolet at the 2024 Daytona 500", "NASCAR Cup Series 2024 · Daytona 500 · Stock cars"],
];
const failBad = MUST_FAIL.filter(([wid, title, cats]) => P.photoFits(wid, title + " · " + cats, title));
const failGood = MUST_PASS.filter(([wid, title, cats]) => !P.photoFits(wid, title + " · " + cats, title));
const selfOk = !failBad.length && !failGood.length;
console.log(selfOk ? "Self-test passed" : `Self-test FAILED. Let through: ${failBad.map(b => b[1]).join("; ") || "none"}. Wrongly blocked: ${failGood.map(b => b[1]).join("; ") || "none"}`);
if (!selfOk) process.exitCode = 1;
if (process.argv[2] === "--selftest") process.exit();

function why(text, title){
  if (P.PHOTO_NOT.test(text)) return "not on track (" + text.match(P.PHOTO_NOT)[0] + ")";
  if (!P.PHOTO_YES.test(text)) return "doesn't say it's racing";
  if (P.PHOTO_PEOPLE.test(title)) return "people in the title";
  if (P.PHOTO_GOV.test(text)) return "officials/event (" + text.match(P.PHOTO_GOV)[0] + ")";
  if (P.PHOTO_NAME_DATE.test(title)) return "name-and-date title";
  if (!P.PHOTO_ONTRACK.test(text)) return "no car on track mentioned";
  return "series rule";
}
const only = process.argv[2];
const ids = only ? [only] : [...new Set(["f1", "imsa", "wec", "gtwc-america", "gtwc-europe", "gtwc-asia", "gtwc-australia", "porsche-supercup", "carrera-cup-na", "mustang-challenge", "nascar-cup", "indycar", "motogp"].concat(WORLD_LIST.map(x => x.id)))];
const out = [`# Photo audit`, ``, `Run ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by \`node tools/check-photos.mjs\`. Every photo below can appear on the site for that series. Anything that isn't that series' race cars on track needs a new rule in \`photoFits\` (index.html).`, ``, selfOk ? `Self-test passed (known bad photos are rejected).` : `**Self-test FAILED.**`, ``];
let total = 0;
for (const wid of ids) {
  const qs = P.queriesFor(wid); if (!qs.length) continue;
  const raw = [];
  for (const q of qs) { // the same searches the site runs, keeping what was rejected too
    const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=40&prop=imageinfo&iiprop=url|size|extmetadata&iiextmetadatafilter=Categories&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap");
    try {
      const d = await (await fetch(url, { headers: { "User-Agent": "PremierRacingInfo photo audit (contact@premierracinginfo.com)" } })).json();
      for (const p of (d.query && d.query.pages) || []) {
        const ii = p.imageinfo && p.imageinfo[0]; if (!ii || !/\.jpe?g$/i.test(p.title)) continue;
        const cats = new DOMParser().parseFromString((ii.extmetadata && ii.extmetadata.Categories && ii.extmetadata.Categories.value) || "").body.textContent.replace(/\|/g, " · ");
        const title = p.title.replace(/^File:/, "").replace(/\.jpe?g$/i, "").replace(/_+/g, " ");
        raw.push({ title, text: title + " · " + cats, page: ii.descriptionurl });
      }
    } catch (e) { out.push(`- ${wid}: search failed (${e.message})`); }
    await new Promise(r => setTimeout(r, 300));
  }
  const seen = new Set(), kept = [], dropped = [];
  for (const x of raw) { if (seen.has(x.page)) continue; seen.add(x.page); (P.photoFits(wid, x.text, x.title) && P.isFresh(wid, { about: x.text }) ? kept : dropped).push(x); }
  total += kept.length;
  out.push(`## ${wid}: ${kept.length} photo${kept.length === 1 ? "" : "s"}`, "");
  for (const x of kept) out.push(`- [${x.title}](${x.page}) <small>${x.text.slice(x.title.length + 3, x.title.length + 180)}</small>`);
  if (dropped.length) out.push("", `<details><summary>${dropped.length} rejected</summary>`, "", ...dropped.slice(0, 40).map(x => `- ${x.title}: ${why(x.text, x.title)}`), "", "</details>");
  out.push("");
}
out.splice(5, 0, `${total} photos across ${ids.length} series.`, "");
fs.writeFileSync(path.join(root, "PHOTOS.md"), out.join("\n"));
console.log(`PHOTOS.md written: ${total} photos`);
