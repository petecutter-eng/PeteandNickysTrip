# Italy sample — what a good import looks like

Test input: `italy-trip-raw-notes.txt`. **Paste only that file** (after the app's AI prompt) — not this one, or you'll hand the AI the answers.

## Traps built into the input

| Trap | What's in the notes | Good result |
|---|---|---|
| Missing year | Notes and the hotel email have no year; only the Emirates email header (Jun 2027) and Europcar do | All dates in **2027**; ideally listed in `assumptions` |
| Contradiction | Notes say "land Rome **Friday** lunchtime"; the ticket says **Sat 02 Oct** 11:55 | Trust the ticket: arrive Sat 2 Oct. Flag it in `assumptions` |
| Overnight departure | "Fly out Friday night" = EK 371 at **01:05 Sat 2 Oct** | Flight dated **2027-10-02**. `startDate` 2027-10-01 or 10-02 are both defensible |
| Ambiguous date | Dinner "7/10 8pm" | **7 Oct 20:00** (they're in Florence; 10 July is outside the trip) |
| 12-hour times | "9:30am", "3pm", "8pm" | 24-hour in plans: 09:30, 15:00, 20:00 |
| Implied check-out | Florence Airbnb "till we pick up the car" | Check-out **Fri 8 Oct** (car pick-up date) |
| Implied dates | Varenna "3 nights", after the car pick-up | Stay **8 → 11 Oct** |
| Missing booking | Milan "hotel TBC" | A Milan place and/or a stay **11 → 14 Oct** named like "Milan hotel (TBC)", or plans saying it's not booked. **Must not invent a hotel name** |
| Missing data | Return flight: no numbers, "evening I think" | Either a flight on 14 Oct with only from/to (MXP → DXB/BKK) and no times, **or** a plan "Return flight — details TBC". **Must not invent flight numbers or times** |
| No slot in the format: trains | Italo ticket | A 5 Oct plan: "Italo 9921 Roma Termini 10:15 → Firenze SMN 11:47 · coach 5, seats 3A/3B/4A · PNR X7KQ2M". Not a flight |
| No slot: car hire | Europcar | Plans on 8 Oct (pick-up 10:00, ref) and 14 Oct (drop-off MXP T1 14:00) |
| No slot: insurance, contacts, codes | AXA policy, WhatsApp numbers, key-box code, hotel PIN | Plans/reminders on the relevant days (e.g. 2 Oct for the policy, 5 Oct for the key box) |
| Unbooked ideas | Colosseum "maybe", Uffizi "not booked", Last Supper "need to book" | Plans marked as not booked / reminders, not confirmed bookings |
| Out-of-trip date | Nicky back at school Mon 18 Oct | Left out, or it gets skipped with a warning in the preview (it's after `endDate`) |
| Packing notes | Inhaler, swim things, walking poles, type L adapters | Either `"standard"` with these as reminders, or a custom checklist. The prompt says "standard unless I ask", so **standard + reminder plans** is the most faithful |

## Expected shape

- **Travelers:** Pete (or Peter), Nicky (or Nicholas), Margaret (or "Mum"). A booster seat hints Nicky is a child — fine either way.
- **Dates:** start 2027-10-01 or 10-02 · end 2027-10-15 (lands Bangkok the next day) or 10-14.
- **Places:** Rome, Florence, Varenna (or Lake Como), Milan. Home base: arguably Rome (first place), or none — the app falls back to the first place.
- **Stays:** Hotel Santa Maria 2→5 · Lorenzo's flat 5→8 · Giulia's place 8→11 · Milan (TBC) 11→14 if included. None overlap.
- **Flights:** EK 371 BKK→DXB 01:05→04:35 and EK 095 DXB→FCO 07:25→11:55, both **2027-10-02**, class Economy, bags 25kg, conf K9TQ4R. The return appears with no invented details, or only as a plan.
- **Booking:** ref K9TQ4R, via Emirates. Passenger names are optional.

## What to watch in the app

- The preview shows the stay/flight/plan counts and the AI's `assumptions` as ⚠️ lines.
- If the AI dates a stay outside the trip range, or overlaps two stays, you get **Fix in the trip editor** instead of Import. That's expected behaviour, not a failure.
- The calendar needs no horizontal scrolling. 2 Oct shows two ✈ chips, and the stay badges run Rome → Florence → Varenna (→ Milan).
- A bad sign: invented flight numbers or times for the return, an invented Milan hotel name, or a train entered as a flight.
