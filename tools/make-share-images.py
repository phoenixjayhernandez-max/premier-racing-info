# Makes the link-preview image (og:image, 1200x630) for every race page, in the logo style:
#   icons/races/<slug>.jpg     race name, series, track, dates, plus the race start time (Central) or the winner
#   icons/races/manifest.json  slug -> hash of the card text; build-pages.mjs only links images listed here
# These show when someone shares a race page on Reddit, Discord, iMessage, X, WhatsApp, etc.
# Card text comes from tools/.share-cards.json, written by build-pages.mjs. Only changed cards are re-rendered.
# Run from the repo root:  node tools/build-pages.mjs && python3 tools/make-share-images.py && node tools/build-pages.mjs
#   --all   re-render every card (after changing the design; also bump DESIGN below)
# Needs Python Playwright with Chromium (preinstalled in Claude's workspace; pages.yml installs it in Actions).
import hashlib, html, json, pathlib, re, sys
from playwright.sync_api import sync_playwright

DESIGN = "2"  # bump when the card design changes so every image re-renders
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "icons" / "races"
cards = json.loads((ROOT / "tools" / ".share-cards.json").read_text())
man_path = OUT / "manifest.json"
manifest = json.loads(man_path.read_text()) if man_path.exists() else {}
OUT.mkdir(parents=True, exist_ok=True)

src = (ROOT / "tools" / "logo.mjs").read_text()
PRI = json.loads(re.search(r"export const PRI_PATH = (\".*?\");", src).group(1))
NIGHT, PANEL, LINE, SUB, BLUE, BLUE_ON_DARK = "#07101C", "#0D1828", "#1E2B40", "#A9B6C8", "#2461E9", "#85B0FF"
# Series colors tuned for the dark card (same as the Instagram posts)
COLORS = {"f1": "#E8372E", "imsa": "#3B7DE0", "wec": "#14A883", "gtwc": "#E2601F", "gte": "#8B5CF6", "gtas": "#E0408A", "gtau": "#1AA0BC",
          "psc": "#8A94A3", "pccna": "#6E9A2C", "mustang": "#C23B3B", "nascar": "#E3A21A", "indy": "#4F6FD8", "motogp": "#C04BD0"}
import base64
# Fonts go in as data URIs: a page made with set_content() can't load file:// fonts
FONT = lambda n: "data:font/woff2;base64," + base64.b64encode((ROOT / "fonts" / n).read_bytes()).decode()
E = lambda s: html.escape(str(s or ""))


def mark(x_left=-640, x_right=1850):
    w = x_right - x_left
    return (f'<svg viewBox="{x_left} -700 {w} 710"><defs><mask id="cut" maskUnits="userSpaceOnUse" x="{x_left}" y="-700" width="{w}" height="710">'
            f'<rect x="{x_left}" y="-700" width="{w}" height="710" fill="#fff"/>'
            f'<polygon points="-120,-401 {x_right},-401 {x_right - 8},-321 -128,-321" fill="#000"/></mask></defs>'
            f'<path d="{PRI}" fill="#fff" mask="url(#cut)"/>'
            f'<polygon points="{x_left},-413 112,-413 98,-309 {x_left},-309" fill="{BLUE}"/></svg>')


CSS = f'''
@font-face{{font-family:"Archivo Logo";font-style:normal;font-weight:100 900;font-stretch:62% 125%;src:url({FONT("archivo-logo-normal.woff2")}) format("woff2")}}
@font-face{{font-family:"Archivo Logo";font-style:italic;font-weight:100 900;font-stretch:62% 125%;src:url({FONT("archivo-logo-italic.woff2")}) format("woff2")}}
@font-face{{font-family:"Albert Sans";font-weight:400;src:url({FONT("albert-sans-latin-400-normal.woff2")}) format("woff2")}}
@font-face{{font-family:"Albert Sans";font-weight:600;src:url({FONT("albert-sans-latin-600-normal.woff2")}) format("woff2")}}
@font-face{{font-family:"Saira Condensed";font-weight:600;src:url({FONT("saira-condensed-latin-600-normal.woff2")}) format("woff2")}}
@font-face{{font-family:"Saira Condensed";font-weight:800;src:url({FONT("saira-condensed-latin-800-normal.woff2")}) format("woff2")}}
*{{box-sizing:border-box}}
body{{margin:0;width:1200px;height:630px;background:{NIGHT};color:#fff;font-family:"Albert Sans",sans-serif;position:relative;overflow:hidden}}
.edge{{position:absolute;left:0;top:0;bottom:0;width:14px}}
.stripe{{position:absolute;right:-60px;top:122px;width:420px;height:14px;background:{BLUE};transform:skewX(-12deg)}}
.top{{position:absolute;left:72px;right:64px;top:52px;display:flex;align-items:center;justify-content:space-between}}
.lock{{display:flex;align-items:center;gap:18px}}
.lock svg{{height:36px;width:auto;display:block}}
.lock .rule{{width:2px;height:38px;background:{LINE}}}
.w1{{font-family:"Archivo Logo";font-stretch:125%;font-weight:700;font-size:15px;letter-spacing:.4em;line-height:1}}
.w2{{font-family:"Archivo Logo";font-style:italic;font-stretch:78%;font-weight:900;font-size:18px;color:{BLUE_ON_DARK};line-height:1;margin-top:4px}}
.ser{{font-family:"Saira Condensed";font-weight:800;font-size:28px;letter-spacing:.12em;text-transform:uppercase;border:2px solid;padding:4px 16px 2px;border-radius:6px;white-space:nowrap}}
.mid{{position:absolute;left:72px;right:72px;top:150px;bottom:132px;display:flex;flex-direction:column;justify-content:center;padding-bottom:12px}}
.yr{{font-family:"Saira Condensed";font-weight:800;font-size:34px;letter-spacing:.14em;color:{SUB}}}
.nm{{font-family:"Saira Condensed";font-weight:800;line-height:.92;text-transform:uppercase;transform:skewX(-8deg);transform-origin:left bottom;margin-top:4px;max-width:1010px}}
.where{{font-size:28px;color:{SUB};margin-top:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.where b{{color:#fff;font-weight:600}}
.bot{{position:absolute;left:0;right:0;bottom:0;height:132px;background:{PANEL};border-top:2px solid {LINE};display:flex;align-items:center;justify-content:space-between;gap:40px;padding:0 64px 0 72px}}
.lab{{font-family:"Saira Condensed";font-weight:600;font-size:24px;letter-spacing:.14em;text-transform:uppercase}}
.val{{font-family:"Saira Condensed";font-weight:800;line-height:1.02;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.info{{min-width:0;flex:1}}
.url{{font-family:"Saira Condensed";font-weight:800;font-size:32px;text-align:right;line-height:1;flex:none}}
.url small{{display:block;font-family:"Albert Sans";font-weight:600;font-size:17px;color:{SUB};margin-bottom:8px}}
'''

# Shrink the race name until it fits in two lines, and the bottom value until it fits on one
FIT = '''() => {
  const nm = document.querySelector(".nm"); let s = 118;
  nm.style.fontSize = s + "px";
  while (s > 56 && (nm.scrollHeight > s * 0.92 * 2 + 4 || nm.scrollWidth > nm.clientWidth)) { s -= 4; nm.style.fontSize = s + "px"; }
  const v = document.querySelector(".val"); let t = 54;
  v.style.fontSize = t + "px";
  while (t > 28 && v.scrollWidth > v.clientWidth) { t -= 2; v.style.fontSize = t + "px"; }
}'''


def card_html(c):
    col = COLORS.get(c["s"], BLUE_ON_DARK)
    where = f'<b>{E(c["circuit"])}</b>' + (f' · {E(c["location"])}' if c["location"] and c["location"] not in c["circuit"] else "") + f' · {E(c["dates"])}'
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>'
            f'<div class="edge" style="background:{col}"></div><div class="stripe"></div>'
            f'<div class="top"><div class="lock">{mark()}<div class="rule"></div><div><div class="w1">PREMIER</div><div class="w2">RACING INFO</div></div></div>'
            f'<div class="ser" style="color:{col}">{E(c["series"])}</div></div>'
            f'<div class="mid"><div class="yr">{E(c["year"])}</div><div class="nm">{E(c["name"])}</div><div class="where">{where}</div></div>'
            f'<div class="bot"><div class="info"><div class="lab" style="color:{col}">{E(c["label"])}</div><div class="val">{E(c["value"])}</div></div>'
            f'<div class="url"><small>Start times in your time zone</small>premierracinginfo.com</div></div>'
            f'</body></html>')


def key(c):
    return hashlib.sha1((DESIGN + json.dumps(c, sort_keys=True)).encode()).hexdigest()[:10]


force = "--all" in sys.argv
todo = [c for c in cards if force or manifest.get(c["slug"]) != key(c) or not (OUT / f'{c["slug"]}.jpg').exists()]
if todo:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1200, "height": 630})
        for c in todo:
            pg.set_content(card_html(c), wait_until="load")
            pg.evaluate("document.fonts.ready.then(() => document.fonts.size)")
            pg.evaluate(FIT)
            pg.screenshot(path=str(OUT / f'{c["slug"]}.jpg'), type="jpeg", quality=86)
            manifest[c["slug"]] = key(c)
        b.close()
# Drop images for races that no longer exist (cancelled or renamed)
live = {c["slug"] for c in cards}
for s in [s for s in manifest if s not in live]:
    (OUT / f"{s}.jpg").unlink(missing_ok=True); del manifest[s]
man_path.write_text(json.dumps(dict(sorted(manifest.items())), indent=0) + "\n")
print(f"Share images: {len(todo)} rendered, {len(manifest)} in all")
