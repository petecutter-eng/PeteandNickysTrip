# PeteandNickysTrip — Project Handover

## What This Is
A phone-first trip planner that runs entirely in the browser: a colour-coded trip calendar, day details, a packing checklist, an AI plan assistant and an on-demand daily briefing. Any user can create, import, edit and share their own trips in the app — no fork, no backend, no accounts. Trips live in the browser's localStorage and move between devices as files or share links.

It started as Pete Cutter and his son Nicky's Bangkok → Boston trip (1–17 July 2026). That trip is still built in (`DEFAULT_TRIP`). Pete's devices treat it as their own trip, and fresh devices see it as an **example**.

**Live URL:** https://petecutter-eng.github.io/PeteandNickysTrip/
**Repo:** https://github.com/petecutter-eng/PeteandNickysTrip

---

## Repo Structure

```
PeteandNickysTrip/
├── index.html                  ← The whole app (single file, no build step)
├── TRIP_IMPORT_FORMAT.md       ← trip-planner/v1 JSON format + the AI import prompt
├── TRIP_CUSTOMIZATION_PLAN.md  ← Design + phase history of the multi-trip work
├── APP_OVERVIEW.md             ← Plain-language feature overview
├── samples/                    ← Messy sample itinerary + answer key for testing AI import
├── README.md
└── CLAUDE.md                   ← This file
```

GitHub Pages serves `index.html` from `main`. There's no CI and no scheduled job.

---

## index.html — Architecture

Single file, no build step. The only external dependency is Google Fonts; share-link compression uses the browser's own `CompressionStream`.

### Views
- **Calendar view** — week grid computed from the active trip's dates (weekday header starts on the trip's first day; filler cells complete the last week). Responsive, mobile-first.
- **Detail view** — slides in when a day is tapped: accommodation, flights, holiday, plans & notes, journal, briefing.
- **Panels/modals** — AI plan assistant (＋ Add Plans), packing checklist, trips switcher, trip wizard, trip import, share link, daily briefing, mode chooser, key setup.

### Key JS sections (all in one `<script>` block)
| Section | Purpose |
|---|---|
| `DEFAULT_TRIP` | The built-in July trip as a `Trip` object (schemaVersion 1): `meta`, `regions`, `stays`, sparse `days`, `checklist`, `briefing` |
| `getActiveTrip()` / `getDay()` / `tripDateKeys()` | Read path for all rendering. `getDay(k)` resolves a date into label/dow/location/flights/stay/region/events, inheriting from stays and `meta.default*` |
| `renderTripChrome()` / `renderCalendar()` / `openDetail()` | Header, legend, weekday row, flight summary, grid, day view |
| Trip store | `listTrips()`, `switchTrip()`, `duplicateTrip()`, `deleteTrip()`, `migrateStorage()`, `applyTripContext()` |
| Trip wizard | `openWizard()`, `wizValidate(key, draft)`, `wizBuildTrip(draft)`, `commitDraft(draft)` |
| Trip files | `buildAiPrompt()`, `extractJson()`, `draftFromImport()`, `tripToPortable()`, `exportTrip()`, `encodeTripCode()` / `decodeTripCode()`, `checkTripParam()` |
| Daily briefing | `briefingContext()`, `generateBriefing()`, `openBriefing()`, `brMailtoUrl()` / `brWhatsAppUrl()` |
| AI plan assistant | `openIngester()`, `sendIngesterMessage()` (Claude API, `claude-sonnet-4-6`), `confirmPreview()` |
| Checklist | `checklistTravelers()`, `renderChecklist()`, `toggleChecklistItem()` — one tick column per traveler |
| Publishing (built-in trip) | `doPublish()` / `publishToGitHub()` / `buildPublishableHTML()` — bakes notes + checklist edits into `BAKED_*` blocks |
| Guest hand-off (built-in trip) | `collectAdditions()` / `openSend()` → `?import=` → `checkImportParam()` / `mergeImport()` / `publishImported()` |
| `init()` | Migrates storage, seeds baked data into the built-in trip, handles `?import=` / `?trip=`, shows the mode chooser on first open |

### Access modes
On first open the app shows a **mode chooser**; the choice is stored in `localStorage["app_mode"]`, and "switch mode" in the footer reopens it.
- **Plan & view trips** (`"guest"`, no keys) — everything except the AI features: create/import/edit trips, notes, journal, checklist, export/share.
- **Full access** (`"owner"`) — adds the AI plan assistant and the daily briefing (Anthropic key), plus publishing the built-in trip to the live page (GitHub token, site owner only).

### Multi-trip storage (per device)
A device can hold several trips. The built-in trip (`DEFAULT_TRIP`, id `trip_default`) is always read from code; user trips are stored in localStorage.
- `trips_index` — `[{ id, name, startDate }]` for user trips · `trip_<id>` — full Trip JSON · `activeTripId` — trip currently open
- `builtin_trip` — `"owned"` | `"example"` | `"removed"`. Fresh devices see the built-in trip as an **example** (banner shown); creating or importing their own trip deletes the example and its data from that device. Devices with pre-existing data, or owner mode, mark it `"owned"` and never remove it. Deleting the last own trip restores the example.
- Per-trip state: `notes_<id>_<date>`, `checklist_<id>_by_<traveler>`, `checklist_<id>_custom`, `checklist_<id>_removed`, `briefing_to_<id>`
- `storage_version` — `migrateStorage()` moved the old un-namespaced keys (`notes_<date>`, `checklist_pete`, …) under `trip_default` once.
- Trip switcher: footer **🧳 trips** → new / import / open / edit / duplicate / rename / delete / export / share link.

### Trip wizard (create / edit)
`openWizard("create" | "edit", tripId)` opens a 5-step panel — Basics (name, emoji, dates, 1–6 travelers, checklist second language), Places (regions + colour + home base), Stays, Flights, Checklist (standard 46-item template or blank; sections/items editable). It edits a deep-copied draft; `wizSave()` validates every step, then `wizBuildTrip()` folds flights back into `trip.days` (other per-day overrides — location, holiday, events — are preserved). Only user trips are editable; the built-in trip must be duplicated first.

The checklist renders one tick column per traveler (up to 6, colours from `TRAVELER_COLORS`), split either side of the item text; two travelers keep the original one-each-side layout.

### Trip import / export / share (`trip-planner/v1`)
One portable JSON format (spec + AI prompt: `TRIP_IMPORT_FORMAT.md`) is used for AI import, file export/backup and share links. Places are referenced by name, and `days[].plans` become notes.
- **Import:** Trips → 📥 Import trip → *Copy AI prompt* → paste the AI's JSON or upload a file → preview → **Import as new trip** / **Replace** / **Fix in the trip editor** (opens the wizard on the draft at the failing step).
- **Export:** `tripToPortable(tripId, includeNotes)` → `.json` download. Custom checklist items are folded into a section; removed items are dropped.
- **Share link:** `?trip=` + `z` + base64url(deflate-raw JSON) (`j` = uncompressed fallback). Opening one shows the import preview.

### Daily briefing (on demand, in-app)
**☀️ Daily briefing** (calendar) or **Briefing for this day** (detail view): pick a day (defaults to today, else the first/last trip day) → **Generate** calls the Messages API from the browser with the user's `cred_anthropic` key — `claude-opus-5`, `output_config.effort: "low"`, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`), refusal handled. `briefingContext()` sends today + tomorrow + day-after (location, stay, flights, holiday, plans). The text is editable, then sent with **Email** (`mailto:`), **WhatsApp** (`wa.me/<number>?text=`), **Share…** or **Copy**. Nothing is sent automatically; scheduled sends would need a backend (the plan's "Option C").

### Publishing the built-in trip (site owner)
Only the built-in trip is published; user trips never leave the device except via export/share.
1. Notes/checklist edits on the built-in trip live in localStorage (`notes_trip_default_<date>`, …).
2. **Publish** → `buildPublishableHTML()` snapshots the DOM and bakes notes into `BAKED_NOTES`, custom items into `BAKED_CHECKLIST`, removed items into `BAKED_REMOVED`.
3. The GitHub API commits the new `index.html`; Pages deploys in ~60s; other devices seed the baked data into their built-in trip on load.

Family members in guest mode can **Send my additions to Pete** (`?import=` link); Pete reviews and publishes. These buttons only appear while the built-in trip is open.

> `buildPublishableHTML()` snapshots the live DOM, so publish with panels closed — `init()` defends against an open panel being baked in.

### Credentials (stored in browser localStorage, never in code)
- `cred_anthropic` — Anthropic API key (AI plan assistant + daily briefing)
- `cred_github`, `cred_ghuser`, `cred_ghrepo` — optional; only for publishing the built-in trip
- `app_mode` — `"owner"` | `"guest"` · `guest_name` — optional name on guest submissions

---

## Built-in trip — flight details

| | |
|---|---|
| **Passengers** | Peter Guild (MR) · Nicholas Boonsuan (MSTR, child) |
| **Booking ref** | FQ5ZSK · Satguru Travel & Tours, Bangkok |
| **Outbound** | BKK→NRT JL708 07:55 · NRT→BOS JL008 18:25 (1 Jul) |
| **Return** | BOS→NRT JL007 13:15 (16 Jul) · NRT→BKK JL707 18:25 (17 Jul) |
| **Class / bags** | Economy (V) out · Economy (N) return · 2PC each |

---

## Known Gaps / Ideas

1. **Scheduled briefings** — the briefing is on demand only. Hands-off 7am sends need a small backend holding secrets (e.g. a serverless relay for email, or Twilio for WhatsApp with an approved template) — "Option C" in `TRIP_CUSTOMIZATION_PLAN.md`.
2. **Multi-device sync** — trips live per device; export/import or share links move them. Live sync needs a backend.
3. **Wizard coverage** — holidays and per-day location labels can't be edited in the wizard (the import format and exports carry them).
4. **Checklist ticks are keyed by traveler name** — renaming a traveler starts their ticks fresh.
5. **AI plan assistant** adds notes to days but doesn't create stays; it still uses `claude-sonnet-4-6`.
6. **Favicon** — not yet added.

---

## Design Tokens

| Element | Value |
|---|---|
| Background | `#f7f4ef` |
| Primary dark | `#1a3a4a` |
| Place colours (default palette) | `#5aaad8` `#7cb87a` `#e0a458` `#b98ed6` `#e07a7a` `#5fb8a8` |
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
Tell Claude Code what to change. Pages deploys ~60s after a merge to `main`.

### Manually
Edit files on github.com (pencil icon) → commit to `main` → wait ~60s for Pages to deploy.

### Changing the built-in trip
Edit `DEFAULT_TRIP` in `index.html` (it reaches every device on the next load). Users' own trips are changed in the app with the wizard, or by exporting, editing the JSON (by hand or with an AI) and re-importing with **Replace**.
