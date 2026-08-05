# Pratidhvani (formerly "Living Legacy") - Project Context

## Project Overview
**Pratidhvani** ("echo/resonance" — formerly "Living Legacy") is a voice-preservation and interactive-query platform. A **narrator** (typically an elderly or ill person) records short audio clips answering life-story prompts. Family **recipients** can browse those clips, ask a question in plain language to have the platform find and play back the clip where their loved one addressed it, or talk to two flavors of AI companion built on top of the archive. Clips can be locked behind release rules (immediately, on a future date, or on a life event) and shared either broadly or with individually granted recipients.

---

## Architecture
Full-stack app deployed on Vercel, with Supabase as the backing database/auth/storage.

1. **Frontend (`/frontend`):**
   - **React 19** (Vite 8), **Tailwind CSS**, **Framer Motion** for animation.
   - **Recharts** for in-dashboard analytics, **react-router-dom** for routing, **react-hot-toast** for notifications, **PostHog** for analytics.
   - Routes ([`App.jsx`](frontend/src/App.jsx)): `/` (`LandingPage.jsx`, marketing page with video background), `/login` (`Login.jsx`), `/dashboard` (`Dashboard.jsx`, main application surface for recording, browsing, and querying clips).
   - Auth/session handled by `hooks/useAuth.jsx` against Supabase; `lib/supabase.js` and `lib/posthog.js` hold respective client setups.
   - Live Speech Recognition: `AskThemView` and voice inputs integrate browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) for instant real-time visual feedback and fast-track text queries.

2. **Backend (`server.py`, mounted for Vercel via `api/index.py`):**
   - **FastAPI** app bridging the frontend to Supabase and AI services.
   - Auth: validates Supabase JWT bearer tokens per-request (`get_current_user` in [`server.py`](server.py)) and checks user roles (`narrator` or `recipient`).
   - Audio storage: uploads to Supabase Storage `clips` bucket, falling back to local disk (`/tmp/audio` on Vercel, `data/audio` locally) if storage fails.

---

## AI & Audio Processing Layer (`/src`)

- **`audio_pipeline.py` (Unified Audio Engine):**
  Orchestrates high-performance, low-latency voice queries via `process_unified_voice_query`:
  - **Browser Text Fast-Track**: If client sends live browser transcript text, bypasses audio transfer & server STT (0ms STT latency).
  - **LRU Query Cache**: In-memory cache for instant 0ms query responses.
  - **Parallel I/O**: `gemini-3.5-flash-lite` STT and Supabase DB prefetching (clips, profiles, grants) run concurrently via `asyncio.gather`.
  - **Tiered Audio Synthesis Fallback**: ElevenLabs Clone -> Rumik Silk TTS -> Original Recorded Audio URL (`audio_url`).

- **`gemini_service.py`:**
  - Speech-to-text (`transcribe_audio_async`) powered by **`gemini-3.5-flash-lite`** (fast, low-latency audio model).
  - Semantic clip ranking (`rank_clips_with_gemini`, parsed defensively with `json.JSONDecoder().raw_decode`).
  - Multi-turn chat completion (`chat_completion_async`) with connection pooling (`httpx.AsyncClient` & `requests.Session`).

- **`search.py` (Hybrid Search Engine):**
  - `retrieve_relevant_clip`: Executes fast local **TF-IDF document retrieval** first (<1ms local computation, 0ms network latency). If a confident match (score >= 0.35) is found, returns instantly. Falls back to Gemini LLM semantic ranking only when local search is inconclusive.

- **`elevenlabs_service.py`:**
  - ElevenLabs Instant Voice Cloning (`create_voice_clone`, `delete_voice_clone`, `synthesize_with_clone`).
  - Tuned with `optimize_streaming_latency=3` and persistent HTTP connection pooling for rapid audio synthesis turnaround.
  - Output carries explicit `AI-Generated` ID3 metadata and SynthID watermarking.

- **`rumik_service.py`:**
  - Rumik Silk TTS API (`generate_tts_audio`) over pooled `requests.Session()` connections. Generic-voice text-to-speech used for prompt playback and fallback TTS.

- **`guardrails.py`:**
  - Safety layer for the Companion chatbot — `build_system_prompt` (role-aware: narrator vs recipient, profanity/impersonation safeguards) and `enforce_guardrails` (regex backstop).

---

## Companion Mode & Voice Behavior
- **Chatbot Spoken Assistant Voice**:
  - In Companion Mode (`/api/assistant/voice-loop`), the AI assistant's conversational replies (`safe_reply`) are synthesized using the **narrator's cloned voice** (when global `voice_clone_consent` and per-recipient `voice_clone_enabled` grants are active).
  - Falls back to generic Rumik TTS if voice clone is unconsented or disabled.
- **Memory Clip Audio Playback**:
  - When a matched memory clip is found during search or chat, audio playback streams the **authentic, original recorded voice file** (`audio_url` / `original_audio_url`), preserving real voice recordings.

---

## Key API Endpoints (`server.py`)
- `GET/PUT /api/auth/profile` — fetch/update user profile.
- `PUT /api/auth/voice-consent` — narrator toggles global voice clone consent.
- `POST /api/tts`, `POST /api/transcribe` — generic TTS and Gemini STT.
- `GET/POST /api/sessions` — narrator recording sessions (grouped by theme).
- `GET/POST/PUT/DELETE /api/clips` — clip CRUD with RLS & release rules (`now`, `date`, `event`).
- `GET/POST/DELETE /api/recipients` — family connections management.
- `PUT /api/recipients/{id}/voice-clone` — toggle per-recipient voice clone access.
- `GET/POST/DELETE /api/access_grants` — per-clip sharing grants.
- `GET/POST /api/collab` — memory wall collaboration items.
- `POST /api/ask/voice` — unified low-latency voice query endpoint backed by `src/audio_pipeline.py`.
- `POST /api/assistant/chat` — Companion Mode 1 (text chat).
- `POST /api/assistant/voice-loop` — Companion Mode 2 (voice loop chat).

---

## Data Layer (Supabase / Postgres)
Schema lives in [`scripts/living_legacy_migration.sql`](scripts/living_legacy_migration.sql).
- Tables: `profiles`, `sessions`, `clips`, `recipients`, `access_grants`, `collaboration_items`.
- Row Level Security (RLS) enabled on all tables, matching API permission rules.

---

## File Structure & Key Modules
- `server.py` — main FastAPI application and endpoint routes.
- `api/index.py` — Vercel entrypoint importing `server.app`.
- `frontend/` — React application (Vite, Tailwind, components, pages).
- `src/` — AI & performance layer:
  - `audio_pipeline.py`: Unified low-latency audio query engine & LRU cache.
  - `gemini_service.py`: STT, LLM chat, and clip ranking.
  - `search.py`: Fast local TF-IDF & LLM fallback search.
  - `elevenlabs_service.py`: Instant voice cloning & low-latency TTS synthesis.
  - `rumik_service.py`: Generic TTS synthesis.
  - `guardrails.py`: Chatbot system prompts and regex backstop.
- `scripts/living_legacy_migration.sql` — Supabase database schema and RLS policies.
- `.env` — API keys and configuration settings.
