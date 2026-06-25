# PeteandNickysTrip — Project Handover

## What This Is
A live trip planning web app for Pete Cutter and his son Nicky (Nicholas Boonsuan) travelling from Bangkok to the US, July 1–17, 2026. Built as a GitHub Pages site with a daily WhatsApp briefing system.

**Live URL:** https://petecutter-eng.github.io/PeteandNickysTrip/
**Repo:** https://github.com/petecutter-eng/PeteandNickysTrip

---

## Repo Structure

```
PeteandNickysTrip/
├── index.html               ← Full calendar app (single file, self-contained)
├── trip-config.json         ← Source of truth for all trip data (used by briefing)
├── briefing.js              ← Daily WhatsApp briefing script (run by GitHub Actions)
├── CLAUDE.md                ← This file
└── .github/
    └── workflows/
        └── daily-briefing.yml  ← Cron job: runs briefing.js at 7am ET daily Jul 1–17
```

---

## index.html — Architecture

Single-file app. No build step, no dependencies except Google Fonts (CDN).

### Views
- **Calendar view** — 3-week grid (Wed 1 Jul → Tue 21 Jul fillers). Responsive, mobile-first.
- **Detail view** — slides in from right when a day is tapped. Shows flights, accommodation, notes.
- **Ingester panel** — slides up from bottom via ＋ Add Plans FAB button.

### Key JS sections (all in one `<script>` block)
| Section | Purpose |
|---|---|
| `TRIP_DATA` | Static per-day data: flights, location, multiday stays, holidays |
| `BAKED_NOTES` | Notes snapshot baked in at publish time (starts as `{}`) |
| Storage helpers | `getNotes()` / `saveNotes()` — read/write localStorage |
| `renderCalendar()` | Builds the grid from TRIP_DATA + localStorage notes |
| `openDetail()` | Renders day detail view |
| `openIngester()` | Opens the chat ingester panel |
| `sendIngesterMessage()` | Calls Claude API with conversation history + optional file |
| `confirmPreview()` | Saves parsed items from Claude into localStorage |
| `publishToGitHub()` | Commits updated index.html to repo via GitHub API |
| `buildPublishableHTML()` | Bakes current localStorage notes into BAKED_NOTES block |
| `toggleVoice()` / `stopVoice()` | Web Speech API mic input |
| `init()` | Seeds localStorage from BAKED_NOTES, shows setup modal if no creds |

### Credentials
Stored in browser localStorage (never in code):
- `cred_anthropic` — Anthropic API key
- `cred_github` — GitHub Personal Access Token (repo scope)
- `cred_ghuser` — `petecutter-eng`
- `cred_ghrepo` — `PeteandNickysTrip`

### Notes persistence model
1. User adds note via ingester → saved to `localStorage["notes_2026-07-XX"]`
2. Visible immediately in calendar and detail view
3. On Publish → `buildPublishableHTML()` bakes all notes into `BAKED_NOTES` constant
4. GitHub API commits new index.html → GitHub Pages deploys in ~60s
5. Any device loading the live URL gets the baked notes seeded into their localStorage

### Multi-day stays
Defined in `TRIP_DATA` with `multiday: { name, position }` where position is `"start"`, `"mid"`, or `"end"`. Renders as coloured badge + bottom strip. Currently: Gallagher Cottage Jul 7–10 (strip-cottage / #7cb87a).

### Adding a new multi-day stay
Add `multiday` block to each relevant day in `TRIP_DATA`, add a new `.strip-X` CSS colour, add to legend HTML.

---

## trip-config.json — Architecture

Used exclusively by `briefing.js` for the daily WhatsApp message. Structure:

```json
{
  "trip": { "name", "travelers", "timezone_trip", "briefing_time", "whatsapp_recipient_name" },
  "days": {
    "2026-07-01": {
      "location": "...",
      "flights": [...],
      "multiday_stay": { "name", "checkin", "checkout" },
      "holiday": "...",
      "reminders": [...],
      "notes": []
    }
  }
}
```

**Important:** Notes added via the calendar ingester currently live in `index.html` (localStorage → baked HTML). They do NOT automatically write back to `trip-config.json`. For notes to appear in the morning briefing, they need to be manually added to the relevant day's `"notes"` array in `trip-config.json`. This is a known gap — the ingester writing directly to `trip-config.json` via GitHub API is the next planned feature.

---

## briefing.js — Architecture

Node.js script, no npm dependencies (uses built-in `https` and `fs`).

**Flow:**
1. Gets today's date in Bangkok time first, falls back to ET (handles pre/post-trip testing from Bangkok)
2. Loads `trip-config.json` from disk
3. Checks if today is a trip day — exits cleanly if not
4. Builds context object (today + tomorrow + day after)
5. Calls Claude API (`claude-sonnet-4-6`) with system prompt → generates briefing text
6. Sends via Twilio WhatsApp API to Pete's number

**All credentials via environment variables** (GitHub Secrets):
- `ANTHROPIC_API_KEY`
- `TWILIO_ACCOUNT_SID` — stored in GitHub Secrets as `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` — `whatsapp:+14155238886`
- `TWILIO_WHATSAPP_TO` — Pete's WhatsApp number

---

## GitHub Actions — daily-briefing.yml

Cron: `0 11 1-17 7 *` = 11:00 UTC = 7:00am ET, July 1–17 only.

Has `workflow_dispatch` for manual testing. Node 24.

To test manually: Actions tab → Daily Trip Briefing → Run workflow.

---

## Twilio WhatsApp

Using Twilio Sandbox (`whatsapp:+14155238886`). Pete's number is verified on the sandbox.

**Note:** Sandbox sessions expire after 72 hours of inactivity. If the briefing stops arriving during the trip, Pete may need to re-send the join message. For a production upgrade, move to a Twilio-approved WhatsApp sender (takes a few days to approve — do this before July 1).

---

## Flight Details (both passengers)

| | |
|---|---|
| **Passengers** | Peter Guild (MR) · Nicholas Boonsuan (MSTR, child) |
| **Booking ref** | FQ5ZSK |
| **Booked via** | Satguru Travel & Tours, Bangkok |
| **Outbound** | BKK→NRT JL708 07:55 · NRT→BOS JL008 18:25 (1 Jul) |
| **Return** | BOS→NRT JL007 13:15 (16 Jul) · NRT→BKK JL707 18:25 (17 Jul) |
| **Class** | Economy (V) out · Economy (N) return |
| **Baggage** | 2PC each · Meals included |
| **Aircraft** | BKK↔NRT: 787-8 · BOS↔NRT: 787-9 |

---

## Known Gaps / Next Features

1. **Ingester → trip-config.json sync** — notes added via ingester should also write to `trip-config.json` so they appear in the daily briefing automatically
2. **Twilio sandbox → production** — upgrade before Jul 1 to avoid 72hr expiry issue
3. **Favicon** — not yet added
4. **Multi-day event ingestion** — ingester can add multi-day notes but doesn't yet auto-create the `multiday` strip/badge structure in TRIP_DATA; only adds notes to each day individually
5. **This project is designed as a reusable template** — for future trips, replace `TRIP_DATA`, `trip-config.json` days, and update the header/legend. The ingester, briefing, and publish pipeline are all generic.

---

## Design Tokens

| Element | Value |
|---|---|
| Background | `#f7f4ef` |
| Primary dark | `#1a3a4a` |
| Boston strip | `#5aaad8` |
| Cottage strip | `#7cb87a` |
| Flight cells | `#f0f6ff` |
| Notes green | `#4caf50` |
| Fonts | Playfair Display (headers) · Inter (body) |

---

## How to Make Changes

### Via Claude Code (recommended)
```bash
git clone https://github.com/petecutter-eng/PeteandNickysTrip.git
cd PeteandNickysTrip
claude
```
Tell Claude Code what to change. It will edit files and push directly to GitHub. Pages deploys in ~60s.

### Manually
Edit files on github.com (pencil icon) → commit to main → wait ~60s for Pages to deploy.

### Adding a new day's plans
Either use the in-app ingester (＋ Add Plans) or ask Claude Code to add to the relevant day in both `TRIP_DATA` (index.html) and `trip-config.json`.

