// The Premier Racing Info logo: the "Speed Cut" PRI mark (Archivo Black Italic outlines, wdth 100 / wght 900)
// plus the wide wordmark (PREMIER / RACING INFO, set live in "Archivo Logo" from /fonts).
// The cut through the letters is a real transparent gap (an SVG mask), so the mark works on any background.
// Used by build-pages.mjs and make-icons.mjs; index.html carries an inline copy in its header.
export const PRI_PATH = "M27 0 149 -688H547Q605 -688 647.5 -663.5Q690 -639 714.0 -595.0Q738 -551 738 -494Q738 -437 719.5 -387.5Q701 -338 666.5 -301.0Q632 -264 584.5 -243.0Q537 -222 478 -222H287L248 0ZM316 -383H431Q459 -383 476.5 -395.0Q494 -407 502.5 -427.0Q511 -447 511 -471Q511 -497 495.5 -511.0Q480 -525 449 -525H341Z M720 0 841 -688H1262Q1332 -688 1378.0 -664.0Q1424 -640 1446.5 -600.5Q1469 -561 1469 -512Q1469 -448 1449.5 -401.0Q1430 -354 1395.5 -321.5Q1361 -289 1315 -268L1403 0H1158L1094 -231H982L941 0ZM1009 -384H1154Q1174 -384 1194.0 -395.5Q1214 -407 1227.0 -427.0Q1240 -447 1240 -473Q1240 -499 1226.0 -515.0Q1212 -531 1189 -531H1034Z M1467 0 1589 -688H1810L1688 0Z";
export const P_PATH = "M27 0 149 -688H547Q605 -688 647.5 -663.5Q690 -639 714.0 -595.0Q738 -551 738 -494Q738 -437 719.5 -387.5Q701 -338 666.5 -301.0Q632 -264 584.5 -243.0Q537 -222 478 -222H287L248 0ZM316 -383H431Q459 -383 476.5 -395.0Q494 -407 502.5 -427.0Q511 -447 511 -471Q511 -497 495.5 -511.0Q480 -525 449 -525H341Z";
// fill values can be colors or CSS vars, e.g. "var(--ink)"
export function markSVG({ letters = PRI_PATH, ink = "#00082E", stripe = "#2461E9", id = "priCut", cls = "", w = 2490, x0 = -640, label = "" } = {}) {
  const x1 = x0 + w;
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true" focusable="false"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${cls ? `class="${cls}" ` : ""}viewBox="${x0} -700 ${w} 710" ${a11y}><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${x0}" y="-700" width="${w}" height="710"><rect x="${x0}" y="-700" width="${w}" height="710" fill="#fff"/><polygon points="-120,-401 ${x1},-401 ${x1 - 8},-321 -128,-321" fill="#000"/></mask></defs><path d="${letters}" style="fill:${ink}" mask="url(#${id})"/><polygon points="${x0},-413 112,-413 98,-309 ${x0},-309" style="fill:${stripe}"/></svg>`;
}
export const P_MARK = { letters: P_PATH, x0: -400, w: 1160 };
