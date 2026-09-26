# Trip Planner — Application Overview

*A phone-friendly trip planner that runs entirely in your browser. It has a colour-coded trip calendar, an AI plan assistant, a shared packing checklist and an on-demand daily briefing.*

It was built for Pete & Nicky's Bangkok → Boston trip (1–17 July 2026), which ships with the app as an example. Anyone can open the link and plan their own trips. There's nothing to install or fork, and you don't need an account.

---

## What it is, in one paragraph

It's a single web page hosted for free on GitHub Pages: **no server, no database, no app-store install, no sign-up**. Open the link on a phone or computer and you get a trip calendar, tappable day-by-day detail and a packing checklist. You can bring your trip in by building it in a step-by-step editor, or by pasting your booking emails into the AI you already use and importing what it returns. Trips are saved on your device. You can export them as a backup file or send them to someone as a link.

---

## The big features

### 🧳 1. Your own trips, in the app
- **Create a trip** in a five-step editor: basics (name, dates, travellers), places, stays, flights and packing list. It checks your work as you go and catches things like overlapping stays or a flight outside the trip dates.
- **Keep several trips** on one device and switch between them. You can rename, duplicate ("use last summer's trip as a template") or delete them.
- The built-in July trip appears as an **example** on new devices. It's removed once you create your own.

### 🤖 2. Import any itinerary with your own AI
- Tap **Import trip → Copy AI prompt**. Paste the prompt into ChatGPT, Claude, Gemini or similar, followed by whatever you have: booking emails, PDFs, screenshots, a spreadsheet or rough notes.
- Paste the AI's reply back into the app. You see a preview first: travellers, places, stays, flights and day-by-day plans, plus anything the AI had to assume.
- If something needs fixing, the trip editor opens at the right step with everything already filled in.
- Train tickets, car hire, dinner bookings, door codes and similar details become that day's plans.

### 📅 3. Colour-coded trip calendar
- Mobile-first week grid built from your trip's dates, with week labels.
- **Colour strips per place**, so you can see the shape of the trip at a glance.
- **Stay badges** span the nights of each hotel or rental, marking check-in and check-out.
- **Flights inline** on the day, a **flight summary card**, **holiday tags**, and a green dot on days with notes.

### 📖 4. Tap-through day detail
- Tap any day for its accommodation, flights (times, terminals, aircraft, baggage, confirmation code), holidays, plans and notes.
- Add a note or a **journal entry** ("Walked the Freedom Trail, Nicky loved the duck boats…").

### ☀️ 5. Daily briefing, on demand
- Tap **Daily briefing** and Claude writes a short, friendly morning summary. It covers today's location, stay, flights and plans, a "Don't forget" list, and a look at tomorrow.
- Edit the text if you like, then send it by **email** or **WhatsApp** with one tap. You can also share or copy it.
- Uses your own Claude, ChatGPT or Gemini API key — free on Gemini's free tier, otherwise a few cents per briefing.

### 🤖 6. AI plan assistant ("Add to this trip")
- With your own Claude, ChatGPT or Gemini API key, you can chat with an assistant: paste a booking email, attach a PDF or photo, or just speak. The setup screen walks you through getting a key.
- It works out which day each plan belongs to and shows a **preview** before anything is saved.

### 🧳 7. Packing checklist for the whole group
- **One tick column per traveller** (up to six), each with its own progress bar.
- Start from the **standard 46-item list** or a blank one. Edit sections and items, and add an optional **second-language** line under each item.

### 🔗 8. Backup and sharing, without a server
- **Export** saves a trip, with its notes and plans, as a file you can keep or re-import on another device.
- A **share link** packs the whole trip into the link itself. Whoever opens it gets a preview and can add the trip to their own device.
- To change a trip with AI, export it, ask your AI for the change, then import the result with **Replace**.

### 👥 9. Family additions and publishing (the built-in trip)
- For the original July trip, family members could add notes and packing items and send them to Pete as a link.
- Pete reviewed the additions and **published** them to the live page, so every device picked them up.

---

## Why it's nice to live with

| Strength | What it means for you |
|---|---|
| **No install, no accounts** | Just a link. Opens on any phone or laptop browser. |
| **Free to host** | Runs on GitHub Pages at zero cost. |
| **Private by design** | Trips, notes and ticks stay in your browser. Your API key is stored only on your device. Share links carry the trip itself, and nothing is uploaded anywhere. |
| **Bring your own AI** | Use any AI to turn messy booking emails into a trip. |
| **Works offline-ish** | Once loaded, the calendar and checklist keep working from local storage. |
| **Reusable** | Duplicate a trip to start the next one, or import a fresh itinerary in a couple of minutes. |

---

## Under the hood (for the technically curious)

- **One file, no build step.** The whole app is `index.html`. The only external dependency is Google Fonts; share links use the browser's built-in compression.
- **Storage:** the browser's `localStorage`, with each trip's data kept separately.
- **AI:** Claude, ChatGPT or Gemini (the user's choice), called directly from the browser with the user's own key, powers the plan assistant and the daily briefing. AI import works with any AI, because the user copies a prompt into it.
- **Portable format:** `trip-planner/v1` JSON, documented in `TRIP_IMPORT_FORMAT.md`.
- **Hosting:** GitHub Pages. The site owner can publish the built-in trip through the GitHub API.
