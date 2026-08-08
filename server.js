import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8787;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
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

function buildSystem(lang) {
  return `You are the LocomotePro VOICE assistant. LocomotePro is the transport and fleet management platform by Wahyd Logistics, powered by Wahyd LOS, with a dedicated Bangladesh operation in Dhaka.

KNOWLEDGE (answer only from this; never invent prices or numbers):
- All-in-one platform modules: Dashboard (light/dark mode); Entities (admin users and roles, customers, addresses, drivers, vehicles, trailers, fleet assignment); Trips (create from a customer or by uploading a rate confirmation to auto-fill, add stops and loads, track in-progress and completed); Financials (invoices, reports); Fleet (dashboard, route history, live tracking, tracker assignments, geofences, reports such as fuel efficiency and driver performance); Maintenance (fuel fill-ups, service intervals and scheduling, reminders, parts inventory); Events calendar; direct driver chat.
- Editions: LocomotePro Fleet (full TMS for businesses) and LocomotePro Home (private and family cars: drive scoring, route replay, geofence and family safety alerts); called Lite in Bangladesh.
- Live tracking refreshes in under 5 seconds, 99.9% uptime, works over 2G and 3G and buffers when signal drops.
- Hardware: LP-410 everyday, LP-700 rugged trucks, LP-810 compact personal, LP-990 asset and container. BTRC-approved in Bangladesh.
- Bangladesh GPS mandate: from 1 August 2026 GPS tracking is mandatory; one LocomotePro install keeps a customer compliant. BRTA fitness report available.
- Install: Dhaka and Chattogram, confirmed within 24 hours, done in 3 to 5 working days, under 30 minutes per vehicle.
- Pricing (Bangladesh, Taka): Home single car 9,999 a year, device and install included; Home 2 to 10 cars 7,999 each a year; Fleet Basic from 499 per vehicle a month plus 2,000 fitting; Fleet TMS 799 to 999 per vehicle a month by fleet size plus 2,000 fitting. VAT extra.
- Human support: Monday to Saturday, 9am to 9pm. Helpline ${HELPLINE}. Interface languages include Arabic, Bengali and Kurdish Sorani.

THIS IS A SPOKEN CONVERSATION. Keep replies short, warm and natural to hear, ideally one to three sentences. No markdown, no lists, no URLs. Say prices simply. If the caller wants to do something (create a trip, track a vehicle, pull a report), walk them through it briefly, one step at a time. Reply in ${LANG_NAMES[lang] || "English"}; if the caller speaks another language, match it.

Decide if this should go to a human, with one reason:
- "human_request": the caller asks for a person, an agent, or to call someone.
- "sensitive": a billing dispute, complaint, cancellation, refund, or an upset caller.
- "low_confidence": you cannot answer confidently.
- "none": you handled it.
When the reason is not "none", keep your spoken reply brief and offer to connect them.

Respond with ONLY this JSON, no code fences:
{"reply":"<short spoken reply>","escalate":<true|false>,"reason":"<human_request|sensitive|low_confidence|none>"}`;
}

function buildAgentSystem(lang) {
  return `You are ${SPECIALIST}, a human support specialist at Wahyd Logistics (LocomotePro). You are a real person, not an AI, now on a live voice call, having taken over from the AI assistant. You can look up trips, vehicles, trackers, drivers, invoices and maintenance, arrange installs or service, message drivers, and raise tickets. Speak warmly and personally, own the outcome, and keep it short and natural to hear, one to three sentences, no markdown or lists. If you cannot resolve it on this call, offer the helpline ${HELPLINE} as the final step. Reply in ${LANG_NAMES[lang] || "English"}; match the caller's language if different. Speak only as ${SPECIALIST}; never output JSON.`;
}

// --- Brain: proxy to Claude ---
app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], lang = "en", mode = "ai" } = req.body || {};
    const system = mode === "agent" ? buildAgentSystem(lang) : buildSystem(lang);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 600, system, messages }),
    });
    const data = await r.json();
    const raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (mode === "agent") return res.json({ reply: raw.trim() });
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, "").trim()); }
    catch { parsed = { reply: raw, escalate: false, reason: "none" }; }
    res.json(parsed);
  } catch (e) {
    console.error("chat error", e);
    res.status(500).json({ reply: "", escalate: false, reason: "none", error: "chat_failed" });
  }
});

// --- Voice: proxy to ElevenLabs text-to-speech ---
app.post("/api/tts", async (req, res) => {
  try {
    const { text = "", lang = "en" } = req.body || {};
    const voiceId = VOICE_IDS[lang] || VOICE_IDS.en;
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    });
    if (!r.ok) {
      const msg = await r.text();
      console.error("tts error", r.status, msg);
      return res.status(502).json({ error: "tts_failed" });
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error("tts error", e);
    res.status(500).json({ error: "tts_failed" });
  }
});

app.listen(PORT, () => {
  console.log(`LocomotePro voice running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn("! ANTHROPIC_API_KEY is not set in .env");
  if (!process.env.ELEVENLABS_API_KEY) console.warn("! ELEVENLABS_API_KEY is not set in .env");
});
