# LocomotePro Voice (ElevenLabs + Claude)

A small app that runs on your machine or server. The browser captures the mic and plays audio; the Node server keeps your API keys and proxies two things: ElevenLabs for the voice and Claude for the answers and escalation.

Your four ElevenLabs Voice IDs are already wired in by language (English, Urdu, Arabic, Bengali) in `server.js`.

## Run it in 4 steps

1. Install Node 18 or newer (https://nodejs.org).
2. In this folder, copy the env file and add your two keys:
   ```
   cp .env.example .env
   ```
   Open `.env` and paste:
   - `ANTHROPIC_API_KEY` from https://console.anthropic.com
   - `ELEVENLABS_API_KEY` from https://elevenlabs.io (Profile -> API key)
3. Install and start:
   ```
   npm install
   npm start
   ```
4. Open http://localhost:8787 in Chrome. Press Start, allow the microphone, and talk.

## What you get

- Voice replies in your ElevenLabs voices, one per language, instead of the robotic browser voice.
- Four languages with the interface flipping to right-to-left for Urdu and Arabic.
- The escalation ladder: AI first, then "Talk to a specialist" (a live spoken agent), then "Call helpline" as the final step.
- If ElevenLabs is ever unreachable, it falls back to the browser voice so it still speaks.

## Notes

- Keys live only in `.env` on the server, never in the browser. Do not commit `.env`.
- Listening uses the browser's speech recognition (best in Chrome and on Android). To upgrade listening to a cloud service later, add a `/api/stt` route the same way `/api/tts` works.
- Change the Claude model or ElevenLabs model with `ANTHROPIC_MODEL` and `ELEVENLABS_MODEL` in `.env`.
- To change a voice, edit the `VOICE_IDS` map in `server.js`.
- Kurdish Sorani is not in the ElevenLabs voice catalog yet; add it to `VOICE_IDS` if a suitable voice becomes available.

## Deploy

Any Node host works (Render, Railway, Fly, a VPS). Set the two environment variables in the host's dashboard instead of a `.env` file, then run `npm start`. Put it behind HTTPS so the microphone is allowed.
