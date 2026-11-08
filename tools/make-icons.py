# Renders the app icons, favicon and share image from the logo in tools/logo.mjs.
# Run from the repo root after changing the logo:  python3 tools/make-icons.py
# Needs Python Playwright with Chromium (preinstalled in Claude's workspace).
import json, pathlib, re
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "tools" / "logo.mjs").read_text()
PRI = json.loads(re.search(r"export const PRI_PATH = (\".*?\");", src).group(1))
P = json.loads(re.search(r"export const P_PATH = (\".*?\");", src).group(1))

NIGHT, PAPER, INK, BLUE, BLUE_ON_DARK = "#07101C", "#F6F9FC", "#00082E", "#2461E9", "#85B0FF"
FONTS = (ROOT / "fonts").as_uri()


def mark(letters, ink, stripe, uid, x_left, x_right):
    """Mark contents in font units (baseline y=0, cap top y=-688). The stripe starts at x_left."""
    w = x_right - x_left
    return (f'<defs><mask id="{uid}" maskUnits="userSpaceOnUse" x="{x_left}" y="-700" width="{w}" height="710">'
            f'<rect x="{x_left}" y="-700" width="{w}" height="710" fill="#fff"/>'
            f'<polygon points="-120,-401 {x_right},-401 {x_right - 8},-321 -128,-321" fill="#000"/></mask></defs>'
            f'<path d="{letters}" fill="{ink}" mask="url(#{uid})"/>'
            f'<polygon points="{x_left},-413 112,-413 98,-309 {x_left},-309" fill="{stripe}"/>')


def icon_svg(size, safe=1.0, radius=0):
    # P centred; its stripe runs off the left edge. safe < 1 shrinks it into the maskable safe zone.
    s = 0.375 * size / 512 * safe
    tx, ty = size / 2 - 373 * s, size / 2 + 344 * s
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" rx="{radius}" fill="{NIGHT}"/>'
            f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})">{mark(P, "#FFFFFF", BLUE, "c", -tx / s - 50, 780)}</g></svg>')


def og_html():
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:"Archivo Logo";font-style:normal;font-weight:100 900;font-stretch:62% 125%;src:url({FONTS}/archivo-logo-normal.woff2) format("woff2")}}
@font-face{{font-family:"Archivo Logo";font-style:italic;font-weight:100 900;font-stretch:62% 125%;src:url({FONTS}/archivo-logo-italic.woff2) format("woff2")}}
@font-face{{font-family:"Albert Sans";font-weight:400;src:url({FONTS}/albert-sans-latin-400-normal.woff2) format("woff2")}}
@font-face{{font-family:"Albert Sans";font-weight:600;src:url({FONTS}/albert-sans-latin-600-normal.woff2) format("woff2")}}
body{{margin:0;width:1200px;height:630px;background:{NIGHT};display:flex;flex-direction:column;justify-content:center;padding:0 96px;box-sizing:border-box;font-family:"Albert Sans",sans-serif;position:relative;overflow:hidden}}
.lock{{display:flex;align-items:center;gap:36px}}
.lock svg{{height:118px;width:auto;display:block}}
.rule{{width:3px;height:120px;background:#1E2B40}}
.w1{{font-family:"Archivo Logo";font-stretch:125%;font-weight:700;font-size:50px;letter-spacing:.4em;color:#fff;line-height:1}}
.w2{{font-family:"Archivo Logo";font-style:italic;font-stretch:78%;font-weight:900;font-size:58px;color:{BLUE_ON_DARK};line-height:1;margin-top:10px}}
p{{margin:56px 0 0;color:#A9B6C8;font-size:30px;line-height:1.35;max-width:880px}}
.url{{margin-top:20px;color:#fff;font-weight:600;font-size:28px}}
.band{{position:absolute;left:0;right:0;bottom:0;height:10px;background:{BLUE}}}
</style></head><body>
<div class="lock"><svg viewBox="-640 -700 2490 710">{mark(PRI, "#FFFFFF", BLUE, "o", -640, 1850)}</svg><div class="rule"></div>
<div><div class="w1">PREMIER</div><div class="w2">RACING INFO</div></div></div>
<p>Race times in your time zone, where to watch, standings and alerts for 100+ series.</p>
<div class="url">premierracinginfo.com</div><div class="band"></div></body></html>'''


def main():
    icons = ROOT / "icons"
    favicon = icon_svg(64, safe=1.05, radius=14)
    (icons / "favicon.svg").write_text(favicon)
    jobs = [("icon-180.png", icon_svg(180)), ("icon-192.png", icon_svg(192)), ("icon-512.png", icon_svg(512)),
            ("maskable-512.png", icon_svg(512, safe=0.78))]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, svg in jobs:
            size = int(re.search(r'width="(\d+)"', svg).group(1))
            pg = b.new_page(viewport={"width": size, "height": size})
            pg.set_content(f'<body style="margin:0">{svg}</body>')
            pg.screenshot(path=str(icons / name), clip={"x": 0, "y": 0, "width": size, "height": size})
            pg.close()
        og = ROOT / "tools" / ".og.html"
        og.write_text(og_html())
        pg = b.new_page(viewport={"width": 1200, "height": 630})
        pg.goto(og.as_uri()); pg.wait_for_timeout(400)
        pg.screenshot(path=str(icons / "og.png"))
        og.unlink()
        b.close()
    print("Wrote favicon.svg, icon-180/192/512, maskable-512 and og.png in icons/")


if __name__ == "__main__":
    main()
