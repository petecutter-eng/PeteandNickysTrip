# PeteandNickysTrip — Project Handover

## What This Is
A live trip planning web app for Pete Cutter and his son Nicky (Nicholas Boonsuan) travelling from Bangkok to the US, July 1–17, 2026. Built as a GitHub Pages site with a daily briefing system (delivered via Telegram; WhatsApp/Twilio supported as a fallback).

**Live URL:** https://petecutter-eng.github.io/PeteandNickysTrip/
**Repo:** https://github.com/petecutter-eng/PeteandNickysTrip

---

## Repo Structure

```
PeteandNickysTrip/
├── index.html               ← Full calendar app (single file, self-contained)
├── trip-config.json         ← Source of truth for all trip data (used by briefing)
├── briefing.js              ← Daily briefing script — Telegram (or WhatsApp), run by GitHub Actions
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

Used exclusively by `briefing.js` for the daily briefing message. Structure:

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
6. Delivers the briefing via `sendBriefing()`, which dispatches to Telegram when `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` are set, otherwise falls back to WhatsApp/Twilio
7. On any failure, `sendFailureAlert()` sends a short "briefing failed" heads-up to Telegram (best-effort) so a broken run is visible instead of silently missing

**All credentials via environment variables** (GitHub Secrets):
- `ANTHROPIC_API_KEY`
- `TELEGRAM_BOT_TOKEN` — bot token from @BotFather (preferred channel)
- `TELEGRAM_CHAT_ID` — chat ID of the recipient (or group). See "Telegram" below.
- `TWILIO_ACCOUNT_SID` — *(WhatsApp fallback)* stored in GitHub Secrets as `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN` — *(WhatsApp fallback)*
- `TWILIO_WHATSAPP_FROM` — *(WhatsApp fallback)* `whatsapp:+14155238886`
- `TWILIO_WHATSAPP_TO` — *(WhatsApp fallback)* Pete's WhatsApp number
- `TWILIO_CONTENT_SID` — *(WhatsApp fallback, optional)* Content SID of the approved WhatsApp Message Template. See "Twilio WhatsApp" below.

---

## GitHub Actions — daily-briefing.yml

Cron: `0 11 1-17 7 *` = 11:00 UTC = 7:00am ET, July 1–17 only.

Has `workflow_dispatch` for manual testing. Node 24.

To test manually: Actions tab → Daily Trip Briefing → Run workflow.

---

## Telegram (preferred channel)

The daily briefing is delivered via the Telegram Bot API. It works over wifi or mobile data (no SMS/roaming dependency), has no session window, and needs no business verification. `sendBriefing()` uses Telegram whenever `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are both set; otherwise it falls back to WhatsApp/Twilio.

### One-time setup
1. In Telegram, message **@BotFather** → `/newbot` → follow prompts. Copy the **bot token** it gives you → add as GitHub Secret `TELEGRAM_BOT_TOKEN`.
2. Pete (the recipient) opens the new bot and taps **Start** (or sends any message). This is required — bots can't message a user who hasn't started a chat with them.
3. Get the **chat ID**: visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser (replace `<TOKEN>`), find `"chat":{"id":...}` in the JSON → add that number as GitHub Secret `TELEGRAM_CHAT_ID`.
   - For a group chat, add the bot to the group, send a message there, then read the (negative) group chat ID from `getUpdates`.
4. Test: Actions tab → Daily Trip Briefing → Run workflow. The message should arrive in Telegram.

Message is sent as plain text (no `parse_mode`), so emojis and punctuation render as-is. Telegram's 4096-char limit comfortably covers the ~200-280 word briefing.

---

## Twilio WhatsApp (fallback)

If the Telegram secrets are absent, `sendBriefing()` falls back to `sendWhatsApp()`, which supports two send paths, chosen at runtime by whether `TWILIO_CONTENT_SID` is set:

- **Sandbox (default, no `TWILIO_CONTENT_SID`)** — sends a free-form `Body` from `whatsapp:+14155238886`. Pete's number is verified on the sandbox. Good for testing.
- **Production (set `TWILIO_CONTENT_SID`)** — sends via an approved Message Template, passing the generated briefing as template variable `{{1}}`.

### Why the sandbox isn't enough for the trip
Two separate WhatsApp rules break the unattended 7am send on the sandbox:
1. **72h sandbox opt-in** — lapses if Pete doesn't message the sandbox number for 72h; he'd have to re-send the join code.
2. **24h session window** — WhatsApp only allows *free-form* text within 24h of the recipient's last inbound message. The briefing is business-initiated (no preceding reply), so outside that window WhatsApp **requires an approved Message Template**, not free text. The sandbox is lenient about this; production is not.

### Migrating to production (do this before July 1 — approval takes days)
1. In Twilio, register a **WhatsApp Business sender** (Twilio number + Meta business verification).
2. Create a **Message Template** (a.k.a. Content template) with a single body variable `{{1}}`. Suggested body: a short greeting line followed by `{{1}}`. Category: *Utility*.
3. Submit it for approval and wait until status is **Approved**.
4. Copy the template's **Content SID** (`HX…`) and add it as GitHub Secret `TWILIO_CONTENT_SID`.
5. Update `TWILIO_WHATSAPP_FROM` to the approved production sender number.
6. That's it — no code change needed; the next run uses the template automatically.

**Template variable caveat:** WhatsApp rejects tabs and runs of 4+ spaces inside template variables. `sanitizeForTemplate()` in `briefing.js` cleans these. Newlines are preserved (modern templates allow them); if your template is rejected for newlines, also strip `\n` in that function.

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
2. **Delivery channel** — now defaults to Telegram (no roaming/business dependency); set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` to activate (see "Telegram"). WhatsApp/Twilio remains as a fallback, including an optional approved-template production path via `TWILIO_CONTENT_SID`.
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

