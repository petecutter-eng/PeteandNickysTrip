# Trip Planner — Application Overview

*A live, phone-friendly trip-planning web app with an AI plan assistant, a shared packing checklist, and an automated daily briefing.*

Built for Pete & Nicky's Bangkok → Boston trip (1–17 July 2026), but designed as a **reusable template** any traveller can copy and re-point at their own trip.

---

## What it is, in one paragraph

It's a single self-contained web page (`index.html`) hosted for free on GitHub Pages — **no server, no database, no app-store install, no accounts**. Open the link on any phone or computer and you get a colour-coded trip calendar, tappable day-by-day detail, and a bilingual packing checklist. The trip owner gets an **AI assistant** that turns pasted booking confirmations (or a photo of an e-ticket, or spoken words) into calendar entries, and publishes updates to the live page with one tap. A companion script sends an **automated morning briefing** each trip day via Telegram.

---

## The big features

### 📅 1. Colour-coded trip calendar
- Clean multi-week grid, **mobile-first** and responsive, with per-week labels (e.g. *"Week 1 · 1–7 July"*).
- **Location colour strips** so you can see the shape of the trip at a glance (e.g. Boston vs. the Gallagher Cottage stay).
- **Multi-day stay badges** that span across days with start / middle / end markers.
- **Flights shown inline** on the day — flight number and departure time right in the cell.
- **Holiday tags** (e.g. 🎆 Independence Day) and a green dot on any day that has saved notes.
- A **legend** and an at-a-glance **flight summary card** (both passengers, outbound & return, cabin class, baggage, booking reference, travel agent).

### 📖 2. Tap-through day detail
- Tap any day to slide into a full detail view: **flights** (route, times, terminals, aircraft, baggage, cabin, confirmation code), **accommodation**, **notes**, and **holidays**.
- Add plans or a note directly from the detail screen.

### 🤖 3. AI plan assistant ("Add Plans")
This is the standout feature. Instead of hand-entering everything, the owner opens a chat and:
- **Pastes a booking email or itinerary**, or just describes plans in plain English.
- **Attaches a PDF, photo, or text file** — a flight e-ticket, a hotel confirmation, a screenshot — and the assistant reads it directly (it understands both images and PDFs).
- **Speaks instead of typing** — built-in voice dictation via the phone's microphone.
- The assistant (powered by Claude) figures out **what goes on which day**, then shows a **preview card** so you can **confirm or edit before anything is saved**. It remembers the conversation, so you can refine ("actually make that 4am") back and forth.

### 🧳 4. Shared bilingual packing checklist
- **46 items across 5 sections** — Absolute essentials, Health & hygiene, Outdoor & safety, Clothing & gear, and Food/drinks/fun.
- **Every item is in both English and Thai.**
- **Two independent columns** — e.g. one traveller per side — each with its own tick-boxes, **progress bar, and count**, saved on that person's device.
- **Add your own custom items** (with an optional Thai translation), delete items, or clear the whole list (with a confirmation guard).

### ✍️ 5. Notes & journal
- Add quick **notes** to any day.
- Add a **journal entry** per day — a running memory log of what actually happened ("Walked the Freedom Trail, Nicky loved the duck boats…").

### 👥 6. Two modes: Owner and Guest
On first open, the app asks how you're using it:
- **Guest (family/friends, no keys needed):** browse the whole calendar, day details, and packing list; add their own notes and packing items (saved to their device); then send those additions to the owner.
- **Owner:** everything above, **plus** the AI plan assistant and the ability to publish changes to the live page.

### 📤 7. Family hand-off with no backend
A clever, server-free collaboration flow:
- A guest taps **"Send my additions"** → the app packages their notes and packing items into a **shareable link / code**.
- They send it however they like — WhatsApp, Telegram, email, native share sheet.
- The owner opens the link, sees a **review screen**, and approves. **Nothing goes live until the owner publishes it.**

### 🚀 8. One-tap publishing
- The owner **publishes straight to the live page** — the app commits the update through GitHub and the site refreshes in about a minute.
- Published notes and checklist changes are **baked into the page**, so every device picks them up the next time it loads. Publish buttons are available from the calendar, the AI panel, and the checklist.

### 📨 9. Automated daily briefing
A companion script (`briefing.js`), run automatically by a scheduled GitHub Action:
- Fires **each morning during the trip window**.
- Assembles the context for **today, tomorrow, and the day after** — location, flights, accommodation, holidays, and reminders.
- Uses Claude to write a friendly, natural-language **morning briefing** with a **"Don't forget"** section of specific, practical reminders.
- **Delivered over Telegram** (works on wifi or data, no roaming, no SMS, no business setup) with **WhatsApp as a fallback**.
- Trip-timezone aware, so it behaves correctly before, during, and after the trip.

---

## Why it's nice to live with

| Strength | What it means for you |
|---|---|
| **No install, no accounts** | Just a link. Opens on any phone or laptop browser. |
| **Free to host** | Runs on GitHub Pages at zero cost. |
| **Private by design** | Notes and checkboxes live in your own browser; API keys are stored only on your device, never in the code. No tracking, no third-party server. |
| **Works offline-ish** | Once loaded, the calendar and checklist keep working from local storage. |
| **AI does the tedious part** | Booking confirmations become calendar entries without manual typing. |
| **Collaborative without a server** | Family can contribute via a simple share link; the owner stays in control of what goes live. |
| **Reusable** | Swap in a new trip's dates, cities, and flights and the whole thing works again. |

---

## Under the hood (for the technically curious)

- **One file, no build step.** The entire app is `index.html`; the only external dependency is Google Fonts.
- **Hosting:** GitHub Pages (static). **Publishing:** the GitHub API, using a personal access token the owner enters once.
- **Storage:** the browser's `localStorage` for notes, journal, checklist state, and keys.
- **AI:** the Anthropic Claude API — in the app for parsing plans, and in `briefing.js` for the daily message.
- **Automation:** a GitHub Actions cron job runs the briefing on schedule; all secrets live in GitHub, not in the code.
- **Companion data file:** `trip-config.json` holds the day-by-day data the briefing reads.

---

*This document describes the app as built for Pete & Nicky's July 2026 trip. To adapt it for a new trip, edit the `DEFAULT_TRIP` object in `index.html` (dates, travellers, places, stays, flights, checklist) and update `trip-config.json` — the calendar, AI assistant, checklist, publishing, and briefing all carry over unchanged.*
