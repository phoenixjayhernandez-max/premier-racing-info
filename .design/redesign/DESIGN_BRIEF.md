# Design Brief: Premier Racing Info — "pit wall" redesign

## Problem
Fans open the app on a race weekend to answer three questions fast: what's on, when (in my time), and where do I watch it. The current UI answers them, but it's buried under generic app chrome — emoji on every button, ALL-CAPS labels, a card inside a card inside a card, a giant "2 RACES" block that repeats the heading, filler sections ("Make it yours", "Share with friends") — so it reads as AI-generated rather than as a motorsport tool.

## Solution
Make it feel like a pit-wall timing monitor: dark, quiet, dense, numbers first. The weekend screen shows each race's session timing as rows, the next session lit in marshal yellow. Everything else steps back.

## Experience principles
1. **Times over decoration** — if an element doesn't help someone know what's on, when, or how to watch, cut it.
2. **One light on the board** — yellow marks only the next session (and the live/next state). Series colors are the only other color.
3. **Plain words** — sentence case, no emoji, no arrows, no sales copy. Labels say what the thing is.

## Tokens (dark only)
| Name | Hex | Use |
|---|---|---|
| Tarmac | #0E1116 | page background |
| Monitor | #161A21 | panels, rows |
| Monitor raised | #1D222A | inputs, secondary buttons |
| Gridline | #262D37 | rules, borders |
| Floodlight | #E8ECF1 | primary text |
| Telemetry | #8B95A4 | secondary text |
| Marshal yellow | #FFD100 | next session only |
| Green flag | #3DDC84 | "on track" dot only |

Series colors stay as livery plates.

Type: Saira Condensed (headings, all numbers, tabular figures) + Saira (UI text). Sentence case everywhere; uppercase only inside series plates (they're codes).

## Layout
```
Premier Racing                [star] [bell] [Log in]
Weekend  Calendar  Standings  Series  Tickets
────────────────────────────────────────────────
This weekend                              2 races
Central time (your phone) · Change

[F1] Mexico City Grand Prix          ● On track
     Autódromo Hermanos Rodríguez, Mexico City
     Oct 30 – Nov 1
     ┃ Practice 1   Fri Oct 30    1:30 PM  ┃ ← yellow row
       Qualifying   Sat Oct 31    4 PM
       Grand Prix   Sun Nov 1     2 PM
     [Watch on Apple TV]  Tickets  Make your pick
────────────────────────────────────────────────
Latest news                              All news
[search]
 headline rows separated by gridlines (one panel)
```
Left aligned throughout. Radius 8px on panels, 6px on buttons, no shadows.

## Removed
- Big yellow count block + checkered strip (repeats the heading)
- Emoji in buttons, labels and headings (header icons become simple line icons)
- All-caps text and tracked-out labels
- "Make it yours" card → one quiet line; "Share with friends" card → footer link
- Arrows (›, →) on buttons
- Yellow on badges, buttons, tab underline, tickets, picks

## Round 2 — references (Oct 30, 2026)
- **Lamborghini / Porsche (via Inspo archive):** a race name set huge in a condensed face over a full-bleed photo of the place. → Featured race: track photo behind, name at display size.
- **Morgen (Inspo):** the product's real calendar UI is the hero. → The session timing panel sits beside the name, not under a click.
- **F1 app / live timing screens:** a countdown in big tabular figures to the next session. → Ticking countdown, the one moving element.
- **Apple Sports:** secondary games as dense one-line rows. → "Also this weekend" rows: plate, name, next session, watch.
- Calendar gets a sticky month jump; Tickets becomes one ruled list with links on the right.
