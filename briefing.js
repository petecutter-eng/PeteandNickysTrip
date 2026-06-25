// ══════════════════════════════════════════════════════════════
//  Daily Trip Briefing — briefing.js
//  Runs via GitHub Actions each morning at 7am ET during trip
//  Calls Claude API → sends WhatsApp via Twilio
// ══════════════════════════════════════════════════════════════

const https = require("https");
const fs    = require("fs");

// ── Credentials from GitHub Secrets (env vars) ──
const ANTHROPIC_API_KEY     = process.env.ANTHROPIC_API_KEY;
const TWILIO_ACCOUNT_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN     = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM  = process.env.TWILIO_WHATSAPP_FROM;
const TWILIO_WHATSAPP_TO    = process.env.TWILIO_WHATSAPP_TO;

// ── Load trip config ──
const config = JSON.parse(fs.readFileSync("trip-config.json", "utf8"));

// ── Date helpers (all in ET) ──
function getTodayET() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
}

function getDateET(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function formatDateFriendly(dateStr) {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ── Build context for Claude ──
function buildContext(todayKey) {
  const days     = config.days;
  const today    = days[todayKey];
  const tomorrow = days[getDateET(1)];
  const dayAfter = days[getDateET(2)];
  const trip     = config.trip;

  if (!today) return null; // Not a trip day

  // Trip day number
  const allDays  = Object.keys(days).sort();
  const dayNum   = allDays.indexOf(todayKey) + 1;
  const totalDays = allDays.length;

  return {
    recipient: trip.whatsapp_recipient_name,
    tripName:  trip.name,
    travelers: trip.travelers,
    dayNumber: dayNum,
    totalDays,
    today: {
      date:     formatDateFriendly(todayKey),
      dateKey:  todayKey,
      location: today.location,
      flights:  today.flights  || [],
      multiday: today.multiday_stay || null,
      holiday:  today.holiday  || null,
      reminders:today.reminders || [],
      notes:    today.notes    || []
    },
    tomorrow: tomorrow ? {
      date:     formatDateFriendly(getDateET(1)),
      location: tomorrow.location,
      flights:  tomorrow.flights || [],
      reminders:tomorrow.reminders || [],
      notes:    tomorrow.notes || []
    } : null,
    dayAfter: dayAfter ? {
      date:     formatDateFriendly(getDateET(2)),
      location: dayAfter.location
    } : null
  };
}

// ── Call Claude API ──
function callClaude(context) {
  return new Promise((resolve, reject) => {
    const systemPrompt = `You are a friendly, practical travel assistant sending a daily WhatsApp briefing to ${context.recipient} during a family trip to the US. 

Your job is to write a concise, warm morning briefing that covers:
1. A cheerful greeting with the date and day number of the trip
2. Today's location and any flights (with key details: times, terminals, confirmation numbers)
3. Today's planned activities and reservations from notes
4. A "Don't forget" section with the most important practical reminders — be specific and actionable
5. A brief look at tomorrow so they can prepare tonight if needed
6. A short warm sign-off

Tone: friendly, calm, organised — like a well-prepared travel companion. Not overly formal. 
Format: plain text suitable for WhatsApp. Use emojis sparingly but effectively. Keep it scannable with short sections. No markdown headers — use emoji as visual anchors instead.
Length: aim for 200-280 words. Enough to be useful, short enough to read over morning coffee.`;

    const userPrompt = `Here is today's trip context as JSON. Write the morning briefing:\n\n${JSON.stringify(context, null, 2)}`;

    const body = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });

    const options = {
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers:  {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length":    Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content.filter(b => b.type === "text").map(b => b.text).join("");
          resolve(text);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Send WhatsApp via Twilio ──
function sendWhatsApp(message) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To:   TWILIO_WHATSAPP_TO,
      Body: message
    }).toString();

    const auth    = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
    const options = {
      hostname: "api.twilio.com",
      path:     `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      method:   "POST",
      headers:  {
        "Content-Type":   "application/x-www-form-urlencoded",
        "Authorization":  `Basic ${auth}`,
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const parsed = JSON.parse(data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log("✅ WhatsApp sent. SID:", parsed.sid);
          resolve(parsed);
        } else {
          reject(new Error(`Twilio error ${res.statusCode}: ${parsed.message}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──
async function main() {
  const todayKey = getTodayET();
  console.log(`Running briefing for ${todayKey} (ET)`);

  const context = buildContext(todayKey);
  if (!context) {
    console.log("Not a trip day — no briefing sent.");
    process.exit(0);
  }

  console.log(`Day ${context.dayNumber}/${context.totalDays} — ${context.today.location}`);

  try {
    console.log("Calling Claude...");
    const briefing = await callClaude(context);
    console.log("Briefing generated:\n", briefing);

    console.log("Sending WhatsApp...");
    await sendWhatsApp(briefing);
    console.log("Done.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

main();
