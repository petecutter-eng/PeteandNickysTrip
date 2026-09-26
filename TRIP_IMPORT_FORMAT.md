# Trip import format — `trip-planner/v1`

One JSON format moves trips in and out of the app:

- **AI import** — paste booking emails, PDFs, screenshots, spreadsheets or rough notes into any AI together with the prompt below; paste its JSON reply into **Trips → 📥 Import trip**.
- **Export / backup** — **Trips → Export** downloads the trip (including this device's notes and plans) as a `.json` file in this format.
- **Share links** — **Trips → Share link** puts the same JSON, deflate-compressed, in a `?trip=` URL. Opening it shows an import preview.

The canonical prompt lives in the app (`buildAiPrompt()` in `index.html`, **📋 Copy AI prompt** button). The copy below is generated from it.

## Workflow

1. **Trips → 📥 Import trip → 📋 Copy AI prompt.**
2. Paste the prompt into ChatGPT / Claude / Gemini, then add your trip info after it (text, attachments, screenshots).
3. Paste the AI's reply into the import box (or upload a `.json` file) → **Check trip**. Code fences and surrounding text are ignored.
4. Review the preview — summary, anything the AI listed under `assumptions`, skipped data.
   - **Import as new trip**, or **Replace "…"** (when one of your own trips is open: its notes/plans are replaced, checklist ticks for items that still exist are kept).
   - If something needs fixing (a stay outside the trip dates, overlapping stays, a flight without a route), **Fix in the trip editor** opens the wizard at that step with everything prefilled.

To change an existing trip with AI: **Export** it, give the file to your AI with the change you want ("add a day trip to Sintra on the 5th"), then import the result with **Replace**.

## Fields

| Field | Required | Notes |
|---|---|---|
| `format` | – | `"trip-planner/v1"` |
| `name` | yes* | *Defaults to "Imported trip" with a warning |
| `emoji`, `subtitle` | – | Header |
| `startDate`, `endDate` | **yes** | `YYYY-MM-DD` — the only hard errors |
| `travelers` | yes* | Up to 6 names; one checklist column each. *Defaults to `["Me"]` |
| `homeBase` | – | Place name used on days without a stay (defaults to the first place) |
| `homeLocation` | – | Label for home-base days if it differs from the place name (e.g. place "Boston", label "Boston, MA") |
| `places[]` | – | `{ "name", "color"? }` or just a string. Colours auto-assigned. Matched by name, case-insensitive |
| `stays[]` | – | `{ "name", "place"?, "checkin", "checkout" }`. An unknown `place` creates it |
| `flights[]` | – | `{ "date", "from", "to", "flight"?, "dep"?, "arr"?, "class"?, "bags"?, "conf"?, "terminalDep"?, "terminalArr"?, "aircraft"? }`; `"route": "BKK → LIS"` also accepted |
| `days[]` | – | `{ "date", "location"?, "place"?, "holiday"?, "events"?, "plans"? }`. `plans` → the day's notes: `{ "type", "text" }` or a string. `place: null` removes the colour strip. `events` are extra calendar chips. Days outside the trip are skipped with a warning |
| `booking` | – | `{ "ref"?, "via"?, "passengers"? }` — flight summary card |
| `secondLanguage` | – | Shows `alt` translations in the checklist |
| `checklist` | – | `"standard"` (default, 46 items), `"none"`, or `[{ "section", "items": ["Passport", { "en", "alt"?, "id"? }] }]` |
| `assumptions[]` | – | Strings shown as warnings in the preview, then discarded |

Unknown fields are ignored. Item and section `id`s are optional; exports include them so checklist ticks survive a Replace.

## The AI prompt

```text
I want to load a trip into my trip-planner app. Convert the trip information I give you (after this message) into ONE JSON object in the exact format below.

Reply with the JSON only — no explanation, no markdown code fences.

FORMAT (example values — replace them with my trip):
{
  "format": "trip-planner/v1",
  "name": "Summer in Portugal",
  "emoji": "🇵🇹",
  "subtitle": "TAP Air Portugal · Ref ABC123",
  "startDate": "2027-06-01",
  "endDate": "2027-06-10",
  "travelers": [
    "Ana",
    "Ben"
  ],
  "homeBase": "Lisbon",
  "places": [
    {
      "name": "Lisbon",
      "color": "#5aaad8"
    },
    {
      "name": "Algarve",
      "color": "#7cb87a"
    }
  ],
  "stays": [
    {
      "name": "Casa da Praia",
      "place": "Algarve",
      "checkin": "2027-06-05",
      "checkout": "2027-06-08"
    }
  ],
  "flights": [
    {
      "date": "2027-06-01",
      "from": "BKK",
      "to": "LIS",
      "flight": "TP 1234",
      "dep": "09:10",
      "arr": "18:15",
      "class": "Economy",
      "bags": "2PC",
      "conf": "ABC123"
    }
  ],
  "days": [
    {
      "date": "2027-06-03",
      "location": "Sintra (day trip)",
      "plans": [
        {
          "type": "Tour",
          "text": "Pena Palace entry 10:00 · tickets #88213"
        },
        {
          "type": "Dinner",
          "text": "Tasca do Chico 19:30 · Rua do Diário de Notícias 39"
        }
      ]
    }
  ],
  "booking": {
    "ref": "ABC123",
    "via": "Expedia"
  },
  "checklist": "standard",
  "assumptions": []
}

RULES
1. "format" must be exactly "trip-planner/v1".
2. Dates are "YYYY-MM-DD". Times are 24-hour "HH:MM"; add "+1" when a flight lands the next day (e.g. "07:05+1").
3. startDate is the first day of the trip (usually the outbound departure); endDate is the last day (usually arriving home).
4. travelers: first names of everyone travelling (max 6). Each gets their own packing-checklist column.
5. places: the main towns or areas the trip is based in. homeBase is the place used on days with no stay booked. "color" is optional (#rrggbb).
6. stays: every accommodation, with check-in and check-out dates. "place" must match a name in places.
7. flights: one entry per flight leg, on its local departure date. "from"/"to" are airport codes. Only "date", "from" and "to" are required — leave out fields you don't know.
8. days: only days with something specific. "plans" hold the useful detail — activities, reservations, transfers, car hire, tickets, reminders — one short line each, with times, addresses and confirmation numbers. "type" is one or two words (Tour, Dinner, Transfer, Car hire, Reminder…). "location" is optional: where we are that day if it differs from the stay or home base. "holiday" is optional: a public holiday on that day.
9. checklist: "standard" for the app's built-in packing list, "none" for no list, or a custom list shaped like [{"section": "Essentials", "items": ["Passport", "Cash"]}]. Use "standard" unless I ask otherwise.
10. Use only information I give you. Never invent flights, times, hotels or confirmation numbers — leave unknown optional fields out.
11. If you had to assume something (a missing year, an unclear date), list it in "assumptions"; the app shows these to me before importing.
12. Leave out "secondLanguage" unless I ask for packing-list translations (then set it to the language name and add "alt" translations to a custom checklist).

MY TRIP INFO:
```
