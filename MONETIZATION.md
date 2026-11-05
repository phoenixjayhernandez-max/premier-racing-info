# Affiliate links: the plan

Everything is built and **switched off**. While it's off, the site looks and works exactly as before. Turn each program on only after it approves the site and the business setup below is done.

## Before turning anything on
- [ ] Business setup: LLC (or sole proprietor to start), EIN, and a bank account for payouts. Networks ask for tax info (W-9) before they pay.
- [ ] Quick legal check of the Terms and Privacy pages. The Terms already say affiliate links will be labeled. The Privacy page should mention that partner sites set their own tracking cookies once someone clicks through.
- [ ] Enough traffic to get approved. Some networks reject brand-new sites, so apply once Analytics shows steady visits.

## Programs, in order

| # | What | Program | Network | Pays (at last check) | Where it shows |
|---|---|---|---|---|---|
| 1 | Tickets | StubHub | Partnerize | ~4% of ticket + fees, 30-day cookie, US & Canada | Replaces the "Search tickets" Google link on race pages, the Tickets tab, and series ticket rows |
| 2 | Hotels | Booking.com | Awin | % of booking | New "Hotels near the track" button next to tickets |
| 3 | Streaming | Fubo | Fubo partner program | Per sign-up | Extra button in the full watch list for NASCAR, IndyCar and MotoGP (FOX / FS1) |
| — | Backups | Vivid Seats (FlexOffers, ~3.2%), TickPick (CJ, ~4%, 45-day cookie) | | | Swap into the tickets slot if StubHub says no |
| — | Skip for now | SeatGeek (0.2–0.8%, 2-day cookie), F1 Store (1.6%, 1-day cookie) | | Too little | |
| — | Later | Fanatec sim racing gear | | | Better fit for ASHJAYLAPS videos than the site |

There's no link-based affiliate program for official F1 tickets (F1 Experiences only works with agencies), so F1 races keep the official F1 link first.

Rates change; confirm them when you apply.

## How to turn one on
All the settings live in one place: `const AFFILIATE` in `index.html`, just above `function esc`.

1. After approval, copy your tracking-link format from the network's dashboard. Most have a "deep link" builder that takes any page address.
2. Paste it into that program's `wrap`, putting `{url}` where the destination page goes. Example shape (yours will differ): `"https://stubhub.prf.hn/click/camref:YOURID/destination:{url}"`.
3. Change `on:false` to `on:true`.
4. To switch a backup ticket partner in, change `name` and `search`. For example, Vivid Seats search is `https://www.vividseats.com/search?searchTerm={q}`. Check the format on their site first.
5. Commit and push. The daily rebuild updates all the race pages. Bump `pri-vNN` in `sw.js`.
6. Click a few links on the live site and confirm the network dashboard records the clicks.

## Rules the code already follows
- Official sellers (series or circuit stores, F1 tickets) always come first. The affiliate link replaces only the Google search.
- Every affiliate link says "affiliate" and uses `rel="sponsored"` (Google's rule for paid links).
- Wherever one shows, so does the disclosure line: "Links marked 'affiliate' may earn Premier Racing Info a commission, at no extra cost to you." (FTC rule.)
- If a race has no official link (`checker section 6` lists these), the affiliate link becomes the first ticket button. Adding the official store to `TICKETS` or `CIRCUIT_SITES` puts it back on top.
