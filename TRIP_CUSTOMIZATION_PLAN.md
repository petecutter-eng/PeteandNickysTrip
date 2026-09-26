# Implementation Plan — Option A: In-App Trip Customization (no fork required)

**Goal:** Turn the trip from hardcoded source into runtime data, so any user can create and edit a trip *inside the app* — no GitHub fork, no code edits. Plus: decouple the daily briefing from the single-repo GitHub Actions cron and replace it with an **on-demand briefing** the user can generate in-app and optionally **email to any address**.

**Approach:** Pure client-side. Stays a single static `index.html` on GitHub Pages — no backend, no database, no accounts. Trips live in the browser and travel via share links / file export.

> Note on terminology: the existing scheduled briefing is delivered over **Telegram** (WhatsApp/Twilio fallback) by a **GitHub Actions** cron reading `trip-config.json`. That mechanism is inherently single-trip and tied to this repo, so it is *replaced*, not extended, by the in-app briefing below.

---

## 1. Core idea: one `Trip` object as the source of truth

Today the trip is scattered across hardcoded spots in `index.html`:

| Hardcoded now | Line(s) | Becomes |
|---|---|---|
| `TRIP_DATA` | ~907 | `trip.days` |
| `WEEK_LABELS` | ~952 | computed from `trip.meta.startDate/endDate` |
| `<h1>` + subtitle | 848–849 | `trip.meta.name` / `trip.meta.subtitle` |
| `.legend` markup | 851–857 | generated from `trip.regions` |
| `.strip-*` CSS colors | in `<style>` | CSS variables generated from `trip.regions` |
| `CHECKLIST_DATA` (46 items) | ~1960 | `trip.checklist` |
| Traveler columns "Pete"/"Nicky" | checklist markup + `checklist_pete/nicky` | `trip.meta.travelers[]` |
| Flight summary card | 877–882 | generated from flights |
| `trip-config.json` (briefing) | file | folded into the same `Trip` object |

### Proposed schema (`schemaVersion: 1`)

```jsonc
{
  "schemaVersion": 1,
  "id": "trip_ab12cd",                 // generated on create
  "meta": {
    "name": "Nicky & Pete's US Trip",
    "emoji": "✈️",
    "subtitle": "Japan Airlines · Ref: FQ5ZSK",
    "startDate": "2026-07-01",
    "endDate": "2026-07-17",
    "travelers": ["Pete", "Nicky"],    // drives checklist columns
    "secondLanguage": "th",            // checklist alt-language label; "" = single language
    "timezoneHome": "Asia/Bangkok",
    "timezoneTrip": "America/New_York"
  },
  "regions": [                         // drives legend + day color strips
    { "id": "boston",  "name": "Boston",            "color": "#5aaad8" },
    { "id": "cottage", "name": "Gallagher Cottage", "color": "#7cb87a" }
  ],
  "stays": [                           // editable source; app expands to per-day badges
    { "regionId": "cottage", "name": "Gallagher Cottage",
      "checkin": "2026-07-07", "checkout": "2026-07-10" }
  ],
  "days": {                            // per-day overrides; sparse (only days with data)
    "2026-07-01": {
      "location": "In transit",
      "regionId": "boston",
      "holiday": null,
      "flights": [
        { "route": "BKK → NRT", "flight": "JL 708", "dep": "07:55", "arr": "16:05",
          "terminalDep": "Suvarnabhumi", "terminalArr": "Narita T2",
          "aircraft": "787-8", "bags": "2PC", "cls": "Economy (V)", "conf": "FQ5ZSK" }
      ]
    }
  },
  "checklist": {
    "sections": [
      { "id": "essentials", "title": "Absolute essentials",
        "items": [ { "id": "essentials-1", "en": "Passport", "alt": "หนังสือเดินทาง" } ] }
    ]
  },
  "briefing": { "recipientEmail": "", "tone": "friendly" }
}
```

Key simplifications vs. today:
- **Multi-day stays** are declared once in `stays` (check-in/out); the app computes the start/mid/end badges and strips per day. No more repeating `multiday:{position}` on every day.
- **Colors** move into `regions`, so the legend and day strips are generated — no hand-written CSS classes per trip.
- **Checklist `alt`** replaces the Thai-specific `th` field, so the second language is configurable (or omitted).

---

## 2. Storage model (multi-trip, per device)

New localStorage layout (namespaced by trip id so one device can hold several trips):

| Key | Holds |
|---|---|
| `trips_index` | `[{ id, name, startDate }]` — for the trip switcher |
| `trip_<id>` | the full `Trip` JSON |
| `activeTripId` | which trip is currently open |
| `notes_<id>_<date>` | notes (was `notes_<date>`) |
| `journal_<id>_<date>` | journal entries |
| `checklist_<id>_<travelerKey>` | per-traveler tick state (was `checklist_pete/nicky`) |
| `checklist_<id>_custom` / `_removed` | custom / removed items |
| `cred_anthropic` | AI key — stays global (per device, not per trip) |

**Migration:** on first load after the update, if old un-namespaced keys exist (`notes_*`, `checklist_pete`, …) and no `trips_index`, wrap the current hardcoded trip as `trip_default`, move existing user state under `trip_default`, and set it active. Nothing is lost.

---

## 3. Rendering changes (function by function)

All read from `getActiveTrip()` instead of the constants:

- `renderCalendar()` (~1012): iterate `trip.days` over the date range; compute week rows and `WEEK_LABELS` from `startDate/endDate`; apply region color as an inline style / CSS var instead of `.strip-*`; expand `stays` into badges.
- `openDetail()` (~1059): render flights/holiday/stay/notes from the day object.
- Header/legend/summary: rendered from `meta` + `regions` at init instead of static HTML.
- Checklist (`renderChecklist`, `checklistCounts`, `toggleChecklistItem`, progress): iterate `trip.checklist.sections`; generate one column per `meta.travelers[]` (today's two-column Pete/Nicky becomes N columns); use `alt` for the second-language line.
- `buildPublishableHTML()` (~1482): **no longer bakes trip data into HTML** — trip data lives in localStorage / share links now. (See §6 on what "publish" means going forward.)

---

## 4. New UI

1. **Create-trip wizard** (first run when no trips exist, or via "New trip"):
   - Step 1 — Basics: name, emoji, start/end dates, travelers (add/remove names), second language (optional).
   - Step 2 — Places: add regions (name + color picker) → these become the legend.
   - Step 3 — Stays: add multi-day stays (region, check-in/out).
   - Step 4 — Flights: add flights to specific days (optional; can also be added later via the AI assistant).
   - Step 5 — Checklist: start from a **default template**, the current 46-item list, or blank; edit inline; set the second-language column.
   - Finish → trip saved, becomes active.
2. **Trip switcher** in the header/footer: list trips, switch active, rename, duplicate ("use as template for next trip"), delete.
3. **Edit trip**: reopens the wizard on any section.
4. **Backup/share controls** (see §5).

The AI "Add Plans" assistant, notes, journal, and packing checklist all keep working — they just operate on the active trip.

---

## 5. Sharing & backup (replaces "fork the repo")

- **Export / Import trip**: download the `Trip` JSON as a file; import re-creates it on another device. This is the reliable backup path (localStorage can be cleared).
- **Share link**: reuse the existing `encodePayload`/`decodePayload`/`buildShareLink` (1764–1773) to put a whole trip in a `?trip=<code>` URL. Compress with **LZ-String** (tiny, via CDN) before base64 so links stay short; opening such a link offers "Add this trip." QR generation optional for phone-to-phone.
- **Large trips**: if a compressed link exceeds a safe length, prompt to share the file export instead.

This makes distribution "send a link/file," not "fork on GitHub." The app is hosted once (your GitHub Pages URL); everyone loads the same page and brings their own trip.

---

## 6. What happens to "Publish" and GitHub

In the multi-trip model, ordinary users don't own the repo, so **"Publish to the live page" is no longer the sharing mechanism** — the share link/file is. Recommendation:
- **Repurpose** the current owner-only GitHub publish (`doPublish`, `publishToGitHub`, PAT flow) into an *optional* "Publish this trip as its own hosted page" power-user feature, **or** remove it from the default UI entirely to keep the app simple. Suggested default: **hide it** for general users; keep it behind owner mode for your own canonical trip if you still want a public URL for it.
- Guest→owner import flow (`collectAdditions`/`mergeImport`) becomes redundant for self-owned trips and can be retired, or kept only for the hosted-canonical-trip case.

---

## 7. Briefing — decoupled, on-demand, emailable

Remove the dependency on GitHub Actions + Telegram + `trip-config.json`. Port the briefing logic into the client and make it user-triggered.

### 7a. Generate on demand (in-app)
- New **"☀️ Briefing"** button opens a small panel.
- User picks a day (default: today if in range, else the next trip day).
- Build the same context the cron used — **today + tomorrow + day-after** (location, flights, stay, holiday, notes) — from the active trip. Port `buildContext` (briefing.js:53) and the system prompt (the "Don't forget" section, briefing.js:106) into the app.
- Call Claude with the user's existing `cred_anthropic` key (same fetch pattern as the ingester, `claude-sonnet-4-6`), render the briefing in the panel with a **Copy** button.
- No key present? Prompt to add one (the wizard can also collect an optional AI key). Briefing is therefore an owner/AI-enabled feature, like "Add Plans."

### 7b. Send to an email of the user's choice
Offer both, since a static app can't send mail by itself:

1. **`mailto:` (always available, zero setup)** — build `mailto:<addr>?subject=…&body=<briefing>`; opens the user's mail app pre-filled, they hit send. No keys, no service, fully private. Default path. (Plain text; long briefings may need trimming.)
2. **EmailJS (optional, one-tap real send)** — if the user configures an EmailJS public key + template once (stored in localStorage), the app sends the briefing directly to any recipient from the browser, no backend. Recipient defaults to `trip.briefing.recipientEmail`, editable per send.

- **Future upgrade (Option C):** a tiny serverless relay (Cloudflare/Vercel + Resend/Postmark) gives best deliverability, HTML formatting, and — importantly — **scheduled** daily sends again. Out of scope for Option A (that needs a backend); on-demand is the no-backend answer to "daily briefing."

### 7c. Retire the old path
- Remove/disable `.github/workflows/daily-briefing.yml` as the default (or keep it only for your own hosted trip).
- `briefing.js` logic is ported into the app; the standalone script can be kept for the legacy cron or deleted.

---

## 8. Phased build (each phase ships independently)

- **Phase 0 — Model extraction.** Introduce the `Trip` schema; seed it from the current hardcoded trip; make all rendering read from `getActiveTrip()`. *No visible change* — pure refactor + safety net.
- **Phase 1 — Multi-trip storage.** `trips_index`, per-trip namespacing, migration of existing keys, a basic trip switcher.
- **Phase 2 — Create/Edit wizard.** Full trip authoring UI.
- **Phase 3 — Share/backup.** Export/import JSON, compressed `?trip=` link, optional QR; hide/repurpose GitHub publish.
- **Phase 4 — On-demand briefing.** In-app generation + `mailto` send; optional EmailJS.
- **Phase 5 — Cleanup.** Retire the Actions cron path, update `CLAUDE.md`/`README`, refresh `APP_OVERVIEW.md`.

Phases 0–1 are the load-bearing refactor; 2–4 are the visible features; 5 is housekeeping.

---

## 9. Risks & edge cases

- **localStorage is per-device and clearable** → make Export/Import first-class; nudge users to back up.
- **Share-link length** → compress; fall back to file export for big trips.
- **Checklist column count** → generalizing 2 fixed columns (Pete/Nicky) to N travelers touches layout; verify on phone widths.
- **AI key for briefing** → briefing/ingester require a key; guests without one get a clear prompt, not a broken button.
- **Backward compatibility** → migration must detect and preserve any already-saved notes/checklist state from the current version.
- **Stale baked content** → the currently published page has an old chat transcript and baked notes; the refactor should render only from the trip model, not from baked HTML.

---

## 10. Out of scope (Option A) / natural next step

- Live multi-device sync, per-trip **scheduled** briefings, and accounts all require a backend — that's **Option C**, and the `Trip` schema above is designed so it drops straight into a server-backed store later without reworking the app.
