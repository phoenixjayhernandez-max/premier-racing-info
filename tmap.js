// Track maps: the layout diagram from the circuit's Wikipedia article (Wikimedia Commons, free licences only, credited).
// Used by the app (race sheets) and the static race/track pages. Markup: <figure class="tmap" data-tmap="Circuit name" data-loc="City"></figure>
// The figure stays hidden until a map is found, so a track with no free map just shows nothing.
(function(){
  const KEY = "pri-tmap-v1", FREE = /^(cc[ -]by(-sa)?( \d(\.\d)?)?|cc0|public domain|pd\b|pdm)/i;
  const TRACKY = /circuit|raceway|speedway|aut[oó]dromo|motorsport|ring\b|park|course|street|grand prix|motor/i;
  let cache = {}; try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {} };
  const api = q => fetch("https://en.wikipedia.org/w/api.php?format=json&origin=*&" + new URLSearchParams(q)).then(r => r.json());
  const plain = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const fold = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // A layout diagram, not a photo: SVG, or a file named like a map/layout
  const isMap = f => /\.svg$/i.test(f) || /map|layout|track|circuit|course|configuration|plan/i.test(f) && !/\.(jpe?g)$/i.test(f);
  const pending = {};
  function find(circuit, loc){
    const ck = circuit + "|" + (loc || "");
    if (ck in cache) return Promise.resolve(cache[ck]);
    if (pending[ck]) return pending[ck];
    const words = fold(circuit).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !/circuit|international|raceway|speedway|street|streets|motor|park|track/.test(w));
    const pick = pages => pages.find(p => p.pageimage && isMap(p.pageimage) && (TRACKY.test(p.title) || words.some(w => fold(p.title).includes(w))) && (!words.length || words.some(w => fold(p.title).includes(w))));
    const props = { prop: "pageimages", piprop: "name", pilicense: "free" };
    return pending[ck] = api({ action: "query", titles: circuit, redirects: 1, ...props })
      .then(d => pick(Object.values((d.query && d.query.pages) || {}))
        || api({ action: "query", generator: "search", gsrsearch: `${circuit} ${loc || ""} circuit`, gsrlimit: 4, ...props })
          .then(d2 => pick(Object.values((d2.query && d2.query.pages) || {}).sort((a, b) => a.index - b.index))))
      .then(p => p ? api({ action: "query", titles: "File:" + p.pageimage, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: 900, iiextmetadatafilter: "Artist|LicenseShortName" }).then(d3 => {
          const f = Object.values((d3.query && d3.query.pages) || {})[0], ii = f && f.imageinfo && f.imageinfo[0], m = (ii && ii.extmetadata) || {};
          const lic = plain(m.LicenseShortName && m.LicenseShortName.value);
          return ii && FREE.test(lic) ? { src: ii.thumburl || ii.url, page: ii.descriptionurl, by: plain(m.Artist && m.Artist.value).slice(0, 60), lic, title: p.title } : 0;
        }) : 0)
      .then(v => { cache[ck] = v; save(); return v; })
      .catch(() => null);
  }
  const esc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function fill(el){
    if (el.dataset.tdone) return; el.dataset.tdone = "1";
    find(el.dataset.tmap, el.dataset.loc).then(v => {
      if (!v) return;
      const img = new Image();
      img.alt = `Track map of ${el.dataset.tmap}`; img.decoding = "async";
      img.onload = () => {
        el.innerHTML = "";
        const a = document.createElement("a"); a.href = v.page; a.target = "_blank"; a.rel = "noopener"; a.className = "tmap-img"; a.setAttribute("aria-label", "Open the full-size track map"); a.appendChild(img);
        el.appendChild(a);
        el.insertAdjacentHTML("beforeend", `<figcaption>Track map${v.by ? ": " + esc(v.by) : ""} · <a href="${esc(v.page)}" target="_blank" rel="noopener">${esc(v.lic)}</a>, via Wikimedia Commons</figcaption>`);
        el.classList.add("ok");
      };
      img.src = v.src;
    });
  }
  // Loaded straight away (one small cached lookup per track): the figure is hidden until it has a map, and a hidden element never "scrolls into view"
  function scan(root){ (root || document).querySelectorAll("figure.tmap[data-tmap]:not([data-tseen])").forEach(el => { el.dataset.tseen = "1"; fill(el); }); }
  window.trackMaps = scan;
  if (document.readyState !== "loading") scan(); else document.addEventListener("DOMContentLoaded", () => scan());
  new MutationObserver(() => scan()).observe(document.documentElement, { childList: true, subtree: true });
})();
