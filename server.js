import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8787;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

// Your ElevenLabs Voice IDs, one per language.
const VOICE_IDS = {
  en: "qSeXEcewz7tA0Q0qk9fH",
  ur: "aPfeouerZvEVukwmLSP0",
  ar: "QsV9PCczMIklRM6xLPAS",
  bn: "iuABfyf7pRoBzuPqzUCt",
};

const LANG_NAMES = { en: "English", ur: "Urdu", ar: "Arabic", bn: "Bangla" };
const HELPLINE = "+880 1891-446666";
const SPECIALIST = "Tanvir Ahmed";

const ACCT = {
  company: "Meghna Knitwear Ltd", plan: "Fleet TMS", vehicles: 12,
  manager: SPECIALIST, invoiceId: "INV-2026-0871", invoiceAmount: "৳11,388", dueDays: 5,
};

function kb(lang) {
  return `LocomotePro is the all-in-one transport and fleet management platform by Wahyd Logistics, powered by Wahyd LOS, with a dedicated Bangladesh operation in Dhaka.

KNOWLEDGE (answer only from this; never invent prices or numbers):
PLATFORM MODULES
- Dashboard: active trips and operational insights at a glance, with light or dark mode.
- Entities: admin users and roles, customers, saved addresses, drivers, vehicles, trailers, and fleet assignment (assign vehicles to drivers).
- Trips: create a trip by picking or adding a customer, or by uploading a rate confirmation to auto-fill the details; add stops and load details; then save. Track in-progress and completed trips.
- Financials: invoices, reports and records.
- Fleet: fleet dashboard, route history, live tracking, tracker assignments, geofences, and reports such as fuel efficiency and driver performance.
- Maintenance: fuel fill-ups, service intervals and scheduling, reminders, and a parts inventory.
- Events: a calendar of scheduled activities.
- Driver chat: message drivers directly. The interface supports Arabic, Bengali and Kurdish Sorani, with light and dark mode.

EDITIONS, HARDWARE, COMPLIANCE
- Editions: LocomotePro Fleet (full TMS for businesses) and LocomotePro Home (private and family cars: drive scoring, route replay, geofence and family safety alerts); called Lite in Bangladesh.
- Live tracking refreshes in under 5 seconds, 99.9% uptime, works over 2G and 3G, buffers when signal drops and syncs when it returns.
- Hardware: LP-410 everyday, LP-700 rugged trucks, LP-810 compact personal, LP-990 asset and container. BTRC-approved in Bangladesh with local SIMs.
- Bangladesh GPS mandate: from 1 August 2026 GPS tracking is mandatory; one LocomotePro install keeps a customer compliant. BRTA fitness report available on demand.
- Install: Dhaka and Chattogram, confirmed within 24 hours, done in 3 to 5 working days, under 30 minutes per vehicle.

PRICING (Bangladesh, Taka; VAT extra)
- Home single car: 9,999 a year, device and install included. Home 2 to 10 cars: 7,999 per car a year.
- Fleet Basic: from 499 per vehicle a month plus 2,000 fitting. Fleet TMS: 799 to 999 per vehicle a month by fleet size (1 to 5 = 999, 6 to 20 = 949, 21 to 50 = 899, 51 to 100 = 849, 100+ = 799) plus 2,000 fitting.

CONTACT
- Bangladesh: bd@wahyd.com, ${HELPLINE}, Dhaka. Human support Monday to Saturday, 9am to 9pm; otherwise async.

Reply in ${LANG_NAMES[lang] || "English"}. If the user clearly writes in another language, reply in that language instead. Keep replies warm and specific.`;
}

function buildSystem(lang, authed, region, name) {
  const REGION_NAME = { bd: "Bangladesh", me: "the Middle East", sa: "South Asia", na: "North America" };
  let s = `You are the LocomotePro customer-support assistant.

${kb(lang)}${name ? `\n\nThe person's name is ${name}. Address them naturally by first name, without overusing it.` : ""}

BEING AGENTIC: do not just say where a feature lives. For a signed-in user, offer to do it, confirm the specifics, then state clearly that it is done (this is a demo, so you simulate the action): create a trip (including from a rate confirmation), add stops or loads, assign a tracker to a vehicle, assign a vehicle to a driver, pull a report, schedule maintenance, or message a driver. For a guest, explain the capability and offer a demo or sign-in.

Decide whether this turn should go to a human, using exactly one reason:
- "human_request": the user explicitly asks for a person or agent.
- "sensitive": a billing dispute, complaint, cancellation, refund, legal matter, or an upset user.
- "low_confidence": you cannot answer confidently.
- "none": you handled it.`;

  if (authed) {
    s += `

SIGNED-IN CUSTOMER (use only this for account questions; never invent other vehicles, trips or figures):
- Company: ${ACCT.company} (RMG / textiles), Dhaka. Plan: LocomotePro ${ACCT.plan}, ${ACCT.vehicles} vehicles. Account manager: ${ACCT.manager}.
- Live fleet now: 7 moving, 3 idle, 2 stopped.
- DHK-4421: Dhaka to Chattogram, In transit, 54 km/h, cargo 4°C, ETA today 17:40; harsh-braking alert. Driver Karim Hossain. Tracker LP-410.
- CTG-3305: Chattogram Port, Idle; geofence-exit alert 20 minutes ago. Driver Rahim Mia.
- SYL-1198: Sylhet depot, Stopped since 09:10.
- Trips: TRP-2041 (Zara Sourcing, Dhaka to Chattogram) in progress on DHK-4421; TRP-2039 completed yesterday.
- Invoice ${ACCT.invoiceId}: ${ACCT.invoiceAmount}, unpaid, due in ${ACCT.dueDays} days. Maintenance: DHK-4421 service due in ~1,200 km.
You may carry out actions for this customer and confirm them as done.`;
  } else {
    s += `

The user is a guest with no account. For account-specific requests, invite them to sign in, or escalate so the team can follow up.`;
  }

  if (region && REGION_NAME[region]) {
    s += `

CALLER LOCATION: ${REGION_NAME[region]}. Published pricing above is Bangladesh-specific in BDT. If the caller is not in Bangladesh, do not quote BDT figures as their price; give general guidance on editions and features and offer a demo or to connect sales for local pricing.`;
  }

  s += `

Respond with ONLY a JSON object, no code fences:
{"reply":"<your reply>","escalate":<true|false>,"reason":"<human_request|sensitive|low_confidence|none>"}`;
  return s;
}

function buildAgentSystem(lang, name) {
  return `You are ${SPECIALIST}, a human support specialist at Wahyd Logistics (LocomotePro), now handling this conversation live, having taken over from the AI assistant. You are a real person, not an AI.${name ? ` The customer's name is ${name}; greet them by name.` : ""} You can look up trips, vehicles, trackers, drivers, invoices and maintenance, arrange installs or service, message drivers, and raise tickets. Speak warmly and personally, own the outcome, keep replies short and natural, no markdown or lists. If you cannot resolve it, offer the helpline ${HELPLINE} as the final step. Reply in ${LANG_NAMES[lang] || "English"}; match the user's language if different. Speak only as ${SPECIALIST}; never output JSON.`;
}

// --- Brain: proxy to Gemini (Google AI Studio), with real error reporting ---
app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing");
      return res.json({ reply: "", escalate: false, reason: "none", error: "no_gemini_key" });
    }
    const { messages = [], lang = "en", mode = "ai", authed = false, region = "", name = "" } = req.body || {};
    const system = mode === "agent" ? buildAgentSystem(lang, name) : buildSystem(lang, authed, region, name);
    // Gemini uses roles "user" and "model"; map our assistant turns to "model".
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
        }),
      }
    );
    if (!r.ok) {
      const body = await r.text();
      console.error("Gemini upstream error", r.status, body);
      return res.json({ reply: "", escalate: false, reason: "none", error: `gemini_${r.status}` });
    }
    const data = await r.json();
    const raw = ((data.candidates || [])[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (mode === "agent") return res.json({ reply: raw.trim() });
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim()); }
    catch { parsed = { reply: raw, escalate: false, reason: "none" }; }
    res.json(parsed);
  } catch (e) {
    console.error("chat error", e);
    res.json({ reply: "", escalate: false, reason: "none", error: "chat_exception" });
  }
});

// --- Voice: proxy to ElevenLabs text-to-speech ---
app.post("/api/tts", async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) return res.status(500).json({ error: "no_elevenlabs_key" });
    const { text = "", lang = "en" } = req.body || {};
    const voiceId = VOICE_IDS[lang] || VOICE_IDS.en;
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text, model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    });
    if (!r.ok) {
      const msg = await r.text();
      console.error("ElevenLabs error", r.status, msg);
      return res.status(502).json({ error: "tts_failed" });
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("tts error", e);
    res.status(500).json({ error: "tts_failed" });
  }
});

// Simple health check you can open in a browser to confirm keys are seen
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: GEMINI_MODEL,
    gemini_key: !!process.env.GEMINI_API_KEY,
    elevenlabs_key: !!process.env.ELEVENLABS_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`LocomotePro assistant running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn("! GEMINI_API_KEY is not set");
  if (!process.env.ELEVENLABS_API_KEY) console.warn("! ELEVENLABS_API_KEY is not set");
});
