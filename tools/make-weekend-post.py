# Makes the "This weekend in racing" Instagram set from the site's data, in the logo style:
#   01-weekend.png      feed post (1080x1350), every tracked race with its main start time in Central + where to watch
#   02-…png, 03-…png    one carousel slide per race with every session
#   story.png           Instagram story (1080x1920)
#   caption.txt         ready-to-paste caption with hashtags
# These are for Phoenix to post by hand. They are NOT part of the website: the default output folder is
# weekend-post/ (git-ignored), so nothing here gets published to premierracinginfo.com.
# Run from the repo root:  python3 tools/make-weekend-post.py [YYYY-MM-DD] [--out DIR]
# Needs Node and Python Playwright with Chromium (both preinstalled in Claude's workspace).
import html, json, pathlib, re, subprocess, sys, unicodedata
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
out_dir = ROOT / "weekend-post"
if "--out" in args:
    i = args.index("--out"); out_dir = pathlib.Path(args[i + 1]).resolve(); del args[i:i + 2]
data = json.loads(subprocess.run(["node", str(ROOT / "tools" / "weekend-data.mjs"), *args[:1]], capture_output=True, text=True, check=True).stdout)
# No tracked series this weekend? Use the other series with posted start times (NHRA, Baja 1000, …) as the races.
if not data["races"] and data.get("world"):
    data["races"], data["also"] = data["world"], []

src = (ROOT / "tools" / "logo.mjs").read_text()
PRI = json.loads(re.search(r"export const PRI_PATH = (\".*?\");", src).group(1))
NIGHT, PANEL, LINE, SUB, BLUE, BLUE_ON_DARK = "#07101C", "#0D1828", "#1E2B40", "#A9B6C8", "#2461E9", "#85B0FF"
FONTS = (ROOT / "fonts").as_uri()
E = lambda s: html.escape(str(s or ""))
MON = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def dates(a, b):
    ya, ma, da = map(int, a.split("-")); yb, mb, db = map(int, b.split("-"))
    return f"{MON[ma]} {da}–{db}" if ma == mb else f"{MON[ma]} {da} – {MON[mb]} {db}"


def mark(uid, x_left=-640, x_right=1850):
    w = x_right - x_left
    return (f'<svg viewBox="{x_left} -700 {w} 710"><defs><mask id="{uid}" maskUnits="userSpaceOnUse" x="{x_left}" y="-700" width="{w}" height="710">'
            f'<rect x="{x_left}" y="-700" width="{w}" height="710" fill="#fff"/>'
            f'<polygon points="-120,-401 {x_right},-401 {x_right - 8},-321 -128,-321" fill="#000"/></mask></defs>'
            f'<path d="{PRI}" fill="#fff" mask="url(#{uid})"/>'
            f'<polygon points="{x_left},-413 112,-413 98,-309 {x_left},-309" fill="{BLUE}"/></svg>')


CSS = f'''
@font-face{{font-family:"Archivo Logo";font-style:normal;font-weight:100 900;font-stretch:62% 125%;src:url({FONTS}/archivo-logo-normal.woff2) format("woff2")}}
@font-face{{font-family:"Archivo Logo";font-style:italic;font-weight:100 900;font-stretch:62% 125%;src:url({FONTS}/archivo-logo-italic.woff2) format("woff2")}}
@font-face{{font-family:"Albert Sans";font-weight:400;src:url({FONTS}/albert-sans-latin-400-normal.woff2) format("woff2")}}
@font-face{{font-family:"Albert Sans";font-weight:600;src:url({FONTS}/albert-sans-latin-600-normal.woff2) format("woff2")}}
@font-face{{font-family:"Saira Condensed";font-weight:600;src:url({FONTS}/saira-condensed-latin-600-normal.woff2) format("woff2")}}
@font-face{{font-family:"Saira Condensed";font-weight:800;src:url({FONTS}/saira-condensed-latin-800-normal.woff2) format("woff2")}}
*{{box-sizing:border-box}}
body{{margin:0;width:1080px;background:{NIGHT};color:#fff;font-family:"Albert Sans",sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column}}
.stripe{{position:absolute;left:-40px;width:520px;height:22px;background:{BLUE};transform:skewX(-12deg)}}
.top{{display:flex;align-items:center;justify-content:space-between;padding:72px 80px 0}}
.lock{{display:flex;align-items:center;gap:22px}}
.lock svg{{height:46px;width:auto;display:block}}
.lock .rule{{width:2px;height:48px;background:{LINE}}}
.w1{{font-family:"Archivo Logo";font-stretch:125%;font-weight:700;font-size:19px;letter-spacing:.4em;line-height:1}}
.w2{{font-family:"Archivo Logo";font-style:italic;font-stretch:78%;font-weight:900;font-size:23px;color:{BLUE_ON_DARK};line-height:1;margin-top:5px}}
.tz{{font-family:"Saira Condensed";font-weight:600;font-size:26px;letter-spacing:.12em;color:{SUB};border:2px solid {LINE};padding:6px 16px 4px;border-radius:6px}}
.head{{padding:0 80px}}
.k1{{font-family:"Archivo Logo";font-stretch:125%;font-weight:700;letter-spacing:.22em;line-height:1}}
.k2{{font-family:"Archivo Logo";font-style:italic;font-stretch:78%;font-weight:900;color:{BLUE_ON_DARK};line-height:.92;margin-top:10px}}
.when{{font-family:"Saira Condensed";font-weight:800;letter-spacing:.06em;color:{SUB}}}
.rows{{padding:0 80px;display:flex;flex-direction:column}}
.row{{display:flex;align-items:center;gap:28px;border-top:2px solid {LINE};padding:14px 0}}
.row:last-child{{border-bottom:2px solid {LINE}}}
.bar{{width:10px;align-self:stretch;transform:skewX(-12deg);margin:18px 0}}
.mid{{flex:1;min-width:0}}
.ser{{font-family:"Saira Condensed";font-weight:800;font-size:28px;letter-spacing:.1em;text-transform:uppercase}}
.nm{{font-weight:600;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.ct{{color:{SUB};margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.right{{text-align:right;flex:none}}
.day{{font-family:"Saira Condensed";font-weight:600;font-size:26px;letter-spacing:.1em;color:{SUB};text-transform:uppercase}}
.tm{{font-family:"Saira Condensed";font-weight:800;line-height:1;margin-top:2px}}
.on{{color:{BLUE_ON_DARK};font-weight:600;margin-top:6px;white-space:nowrap}}
.also{{padding:0 80px;color:{SUB};line-height:1.4}}
.also b{{color:#fff;font-weight:600}}
.foot{{margin-top:auto;padding:0 80px 72px;display:flex;align-items:flex-end;justify-content:space-between;gap:30px}}
.cta{{color:{SUB};font-size:28px;line-height:1.35;max-width:560px}}
.url{{font-family:"Saira Condensed";font-weight:800;font-size:44px;letter-spacing:.02em;text-align:right;line-height:1}}
.url small{{display:block;font-family:"Albert Sans";font-weight:600;font-size:22px;color:{BLUE_ON_DARK};letter-spacing:.04em;margin-bottom:10px}}
.sess{{padding:0 80px}}
.rname{{font-family:"Saira Condensed";font-weight:800;line-height:.95;text-transform:uppercase;transform:skewX(-8deg);transform-origin:left bottom;margin-top:10px}}
.srow{{display:flex;align-items:center;gap:24px;border-top:2px solid {LINE}}}
.srow:last-child{{border-bottom:2px solid {LINE}}}
.srow .d{{font-family:"Saira Condensed";font-weight:600;font-size:30px;letter-spacing:.1em;color:{SUB};width:80px;flex:none}}
.srow .l{{flex:1;font-size:34px;font-weight:400}}
.srow .t{{font-family:"Saira Condensed";font-weight:800;font-size:44px}}
.srow.main .l{{font-weight:600}}
.srow.main .t{{color:{BLUE_ON_DARK}}}
'''


def lockup(uid):
    return f'<div class="lock">{mark(uid)}<div class="rule"></div><div><div class="w1">PREMIER</div><div class="w2">RACING INFO</div></div></div>'


def page(body, h):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}body{{height:{h}px}}</style></head><body>{body}</body></html>'


def footer(cta="Every session, in your time zone, plus standings and alerts.", bottom=72):
    return (f'<div class="foot" style="padding-bottom:{bottom}px"><div class="cta">{E(cta)}</div>'
            f'<div class="url"><small>LINK IN BIO</small>premierracinginfo.com</div></div>')


def cover(h):
    races = data["races"]; n = len(races); story = h > 1500
    shown = races[:7]
    room = (1080 if story else 640) - (90 if data["also"] else 0)
    rh = min(190 if story else 170, room // max(len(shown), 1))
    big = rh >= 150
    rows = "".join(
        f'<div class="row" style="height:{rh}px"><div class="bar" style="background:{r["color"]}"></div>'
        f'<div class="mid"><div class="ser" style="color:{r["color"]}">{E(r["series"])}</div>'
        f'<div class="nm" style="font-size:{44 if big else 36}px">{E(r["name"])}</div>'
        + (f'<div class="ct" style="font-size:24px">{E(r["circuit"])}</div>' if big else "") + '</div>'
        f'<div class="right">' + (
            f'<div class="day">{E(r["main"]["day"])}</div><div class="tm" style="font-size:{72 if big else 58}px">{E(r["main"]["time"])}</div>'
            if r["main"] else '<div class="day">Times</div><div class="tm" style="font-size:52px">TBA</div>')
        + (f'<div class="on" style="font-size:24px">{E(r["watch"])}</div>' if r["watch"] else "") + '</div></div>'
        for r in shown)
    more = f' <b>+{n - len(shown)} more tracked races.</b>' if n > len(shown) else ""
    also = (f'<div class="also" style="font-size:26px;margin-top:28px">Also racing: <b>{E(", ".join(data["also"]))}</b>.{more}</div>'
            if data["also"] or more else "")
    k = 1.15 if story else 1
    return page(
        f'<div class="stripe" style="top:{150 if story else 128}px"></div>'
        f'<div class="top">{lockup("m1")}<div class="tz">ALL TIMES CENTRAL</div></div>'
        f'<div class="head" style="margin-top:{150 if story else 104}px">'
        f'<div class="k1" style="font-size:{int(46 * k)}px">THIS WEEKEND</div>'
        f'<div class="k2" style="font-size:{int(118 * k)}px">IN RACING</div>'
        f'<div class="when" style="font-size:{int(40 * k)}px;margin-top:16px">{dates(data["fri"], data["sun"])} · {n} RACE{"S" if n != 1 else ""}</div></div>'
        f'<div class="rows" style="margin-top:{60 if story else 40}px">{rows}</div>{also}'
        + footer(bottom=300 if story else 72), h)  # stories: keep clear of Instagram's reply bar


def race_slide(r, uid):
    sess = r["sessions"]
    shown = sess[-8:]  # the last sessions matter most
    rh = min(92, 520 // max(len(shown), 1))
    fs = 34 if rh >= 80 else 30
    if not sess:
        rows = '<div class="srow main" style="height:92px"><div class="d"></div><div class="l">Session times not posted yet</div><div class="t">TBA</div></div>'
    else:
        rows = "".join(
            f'<div class="srow{" main" if s["iso"] == (r["main"] or sess[-1])["iso"] else ""}" style="height:{rh}px"><div class="d">{E(s["day"]).upper()}</div>'
            f'<div class="l" style="font-size:{fs}px">{E(s["label"])}</div><div class="t" style="font-size:{fs + 8}px">{E(s["time"])}</div></div>' for s in shown)
    nm = r["name"]; size = 104 if len(nm) <= 18 else 88 if len(nm) <= 24 else 72
    where = r["circuit"] if r["location"].split(",")[0].strip() in r["circuit"] else f'{r["circuit"]} · {r["location"]}'
    tags = " · ".join(r["tags"][:2])
    return page(
        f'<div class="stripe" style="top:128px;background:{r["color"]}"></div>'
        f'<div class="top">{lockup(uid)}<div class="tz">ALL TIMES CENTRAL</div></div>'
        f'<div class="head" style="margin-top:88px"><div class="ser" style="color:{r["color"]};font-size:32px">{E(r["seriesFull"] or r["series"])}</div>'
        f'<div class="rname" style="font-size:{size}px">{E(nm)}</div>'
        f'<div class="ct" style="font-size:28px;margin-top:12px">{E(where)}{(" · " + E(tags)) if tags else ""}</div></div>'
        f'<div class="sess" style="margin-top:36px">{rows}</div>'
        + (f'<div class="also" style="font-size:28px;margin-top:24px">Watch in the US: <b>{E(r["watch"])}</b></div>' if r["watch"] else "")
        + footer("Live timing links, results and standings on the site."), 1350)


TAGS = {"f1": "#F1 #Formula1", "nascar": "#NASCAR", "indy": "#IndyCar", "motogp": "#MotoGP", "imsa": "#IMSA", "wec": "#WEC",
        "gtwc": "#GTWorldChallenge", "gte": "#GTWorldChallenge", "gtas": "#GTWorldChallenge", "gtau": "#GTWorldChallenge",
        "psc": "#PorscheSupercup", "pccna": "#CarreraCup", "mustang": "#MustangChallenge",
        "nhra": "#NHRA #DragRacing", "score": "#Baja1000 #OffRoad", "supertaikyu": "#SuperTaikyu"}


def caption():
    lines = [f"🏁 This weekend in racing · {dates(data['fri'], data['sun']).title()}", ""]
    for r in data["races"]:
        t = f"{r['main']['day']} {r['main']['time'].replace(chr(8239), ' ')} CT" if r["main"] else "times TBA"
        lines.append(f"{r['series']} {r['name']}: {t}" + (f" on {r['watch']}" if r["watch"] else ""))
    if data["also"]:
        lines += ["", "Also racing: " + ", ".join(data["also"])]
    tags = []
    for r in data["races"]:
        for t in TAGS.get(r["s"], "").split():
            if t not in tags: tags.append(t)
    lines += ["", "Every session in your time zone, where to watch and live alerts: link in bio 👆 premierracinginfo.com", "",
              " ".join(tags + ["#Motorsport", "#RaceWeekend", "#Racing"])]
    return "\n".join(lines) + "\n"


def main():
    if not data["races"]:
        print(f"No tracked races {data['fri']} to {data['sun']}, so no post this weekend.")
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.png"): old.unlink()
    jobs = [("01-weekend.png", cover(1350), 1350), ("story.png", cover(1920), 1920)]
    for i, r in enumerate(data["races"], 2):
        jobs.append((f"{i:02d}-{r['s']}-{re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', r['name']).encode('ascii', 'ignore').decode().lower()).strip('-')}.png", race_slide(r, f"m{i}"), 1350))
    tmp = out_dir / ".render.html"
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, doc, h in jobs:
            tmp.write_text(doc)
            pg = b.new_page(viewport={"width": 1080, "height": h})
            pg.goto(tmp.as_uri()); pg.wait_for_timeout(300)
            pg.screenshot(path=str(out_dir / name))
            pg.close()
        b.close()
    tmp.unlink()
    (out_dir / "caption.txt").write_text(caption())
    print(f"Wrote {len(jobs)} images and caption.txt to {out_dir} for {data['fri']} to {data['sun']}")


main()
