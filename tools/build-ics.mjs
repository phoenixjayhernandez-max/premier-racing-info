// Builds calendar feeds from the data in index.html.
//   node tools/build-ics.mjs
// Writes calendar/all.ics and calendar/<series>.ics. Each session with a known start time gets a
// 30-minute reminder; rounds without published times appear as all-day weekend events.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const grab = (re, what) => { const m = html.match(re); if (!m) throw new Error("Couldn't find " + what); return Function(`return (${m[1]})`)(); };
const RAW = grab(/const RAW = (\[[\s\S]*?\n\]);/, "RAW");
const SESSIONS = grab(/const SESSIONS = (\{[\s\S]*?\n\});/, "SESSIONS");
const FULL = grab(/const SERIES_FULL = (\{[^\n]*\});/, "SERIES_FULL");

const pad = n => String(n).padStart(2, "0");
const utc = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const day = s => s.replace(/-/g, "");
const nextDay = s => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); };
const esc = s => String(s).replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\;").replace(/\n/g, "\\n");
const fold = line => { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); } out.push(line); return out.join("\r\n"); };
const stamp = utc(new Date());
const SITE = "https://premierracinginfo.com/";

function hoursFor(name){
  const m = name.match(/(\d+)\s*Hours?/i); if (m) return +m[1];
  if (/grand prix|race|feature/i.test(name)) return 2;
  return 1;
}

function eventsFor(filter){
  const out = [];
  for (const [id, s, name, circuit, loc, start, end, tags, status] of RAW) {
    if (status === "cancelled" || !filter(s)) continue;
    const label = `${FULL[s] || s} · ${name}`;
    const sess = SESSIONS[id];
    if (sess && sess.length) {
      sess.forEach(([title, iso, support], i) => {
        const st = new Date(iso), en = new Date(st.getTime() + hoursFor(title) * 3600000);
        const lines = ["BEGIN:VEVENT", `UID:${id}-${i}@premier-racing-info`, `DTSTAMP:${stamp}`,
          `DTSTART:${utc(st)}`, `DTEND:${utc(en)}`, `SUMMARY:${esc((support ? "" : "🏁 ") + title + " · " + name)}`,
          `LOCATION:${esc(circuit + ", " + loc)}`, `DESCRIPTION:${esc(label + "\nDetails: " + SITE)}`, `URL:${SITE}`];
        if (!support) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title + " starts in 30 minutes · " + name)}`, "TRIGGER:-PT30M", "END:VALARM");
        lines.push("END:VEVENT");
        out.push(...lines);
      });
    } else {
      out.push("BEGIN:VEVENT", `UID:${id}-weekend@premier-racing-info`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${nextDay(end)}`, `SUMMARY:${esc(label)}`,
        `LOCATION:${esc(circuit + ", " + loc)}`, `DESCRIPTION:${esc((tags || []).join(", ") + "\nStart times are added about a week before.\n" + SITE)}`,
        "TRANSP:TRANSPARENT", "END:VEVENT");
    }
  }
  return out;
}

function write(file, calName, filter){
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Premier Racing Info//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`, "X-WR-TIMEZONE:America/Chicago", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    ...eventsFor(filter), "END:VCALENDAR"];
  fs.mkdirSync(path.join(root, "calendar"), { recursive: true });
  fs.writeFileSync(path.join(root, "calendar", file), lines.map(fold).join("\r\n") + "\r\n");
}

write("all.ics", "Premier Racing Info", () => true);
for (const s of [...new Set(RAW.map(r => r[1]))]) write(`${s}.ics`, `${FULL[s] || s} · Premier Racing Info`, x => x === s);
console.log("Calendars written:", fs.readdirSync(path.join(root, "calendar")).join(", "));
