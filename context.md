# Pratidhvani (formerly "Living Legacy") - Project Context

## Project Overview
**Pratidhvani** ("echo/resonance" — formerly "Living Legacy") is a voice-preservation and interactive-query platform. A **narrator** (typically an elderly or ill person) records short audio clips answering life-story prompts. Family **recipients** can browse those clips, ask a question in plain language to have the platform find and play back the clip where their loved one addressed it, or talk to two flavors of AI companion built on top of the archive. Clips can be locked behind release rules (immediately, on a future date, or on a life event) and shared either broadly or with individually granted recipients.

---

## Architecture
Full-stack app deployed on Vercel, with Supabase as the backing database/auth/storage.

1. **Frontend (`/frontend`):**
   - **React 19** (Vite 8), **Tailwind CSS**, **Framer Motion** for animation.
   - **Recharts** for in-dashboard analytics, **react-router-dom** for routing, **react-hot-toast** for notifications, **PostHog** for analytics.
   - Routes ([`App.jsx`](frontend/src/App.jsx)): `/` (`LandingPage.jsx`, marketing page with video background), `/login` (`Login.jsx`), `/dashboard` (`Dashboard.jsx`, main application surface for recording, browsing, and querying clips), `/verify` (`VerifyVoice.jsx`).
   - Auth/session handled by `hooks/useAuth.jsx` against Supabase; `lib/supabase.js` and `lib/posthog.js` hold respective client setups.
   - Live Speech Recognition: `AskThemView` and voice inputs integrate browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) for instant real-time visual feedback and fast-track text queries.
   - **Progressive Web App (PWA)**:
     - Configured as a fully installable PWA via [`manifest.json`](frontend/public/manifest.json) and service worker [`sw.js`](frontend/public/sw.js) caching key shell assets (`/`, `/index.html`, `/favicon.svg`, `/manifest.json`).
     - Service worker is registered in [`index.html`](frontend/index.html) on window load.
     - Displays customizable "Download App" / "Install Web App" buttons across the landing page navbar, landing page hero, and the dashboard sidebar, visible by default when running in-browser (checked via `window.matchMedia('(display-mode: standalone)')`).
     - Features browser-aware fallback instructions using `react-hot-toast` (e.g., iOS Safari "Add to Home Screen" instructions, Firefox or Chrome manual installation prompts) if direct installation prompts (`beforeinstallprompt`) are not supported.

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

- **`rumik_service.py` (ElevenLabs TTS Wrapper):**
  - Synthesizes text-to-speech audio using modern **ElevenLabs `eleven_flash_v2_5`** models under the hood.
  - Maps legacy speakers (Mia, Sarah, Roger, Dev, Raghunath, Bella) to emotional, context-appropriate ElevenLabs voice IDs.
  - Features text normalization in `clean_text_for_elevenlabs` that cleans dialogue tags (like `[happy]`) and translates conversational markers (like `<laugh>`, `<chuckle>`, `<sigh>`) into realistic phonetic vocalizations.

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

## Cognitive Care & Interactive Tools

1. **Cognitive Anchor & Digital Reminiscence Therapy (DRT):**
   - Accessible via the **Cognitive Anchor** tab. Designed to support users experiencing sundowning, disorientation, or memory loss (e.g., Dementia or Alzheimer's).
   - **Immediate Comfort Anchor**: Displays a prominent "Anchor Me" button to play the narrator's pre-recorded grounding audio message.
   - **Breathing Guide**: Synchronized concentric guide rings dynamically scale and pulse to coordinate deep breathing exercises (4-second inhale/exhale cycles) alongside the audio playback.
   - **Memory Lane Timeline**: A blended chronological timeline displaying narrator's recorded life-story clips (playable directly) and family collaboration wall submissions (photos, memories, notes, and reflections).

2. **Vocal Biomarker Analysis:**
   - Visualized in **The Vault** (for Narrators) and **Preserved Archive** (for Recipients) views.
   - Evaluates vocal parameters—**clarity, pitch, jitter, shimmer, and signal-to-noise ratio (SNR)**—either from Supabase-stored database columns or deterministic user-id seeding.
   - Displays a custom SVG Neobrutalist line chart representing the history of clarity scores once at least 2 clips are recorded.
   - Provides longitudinal tracking of neural/cognitive stability. If a decline of >8% from baseline is detected, warns families/caregivers of potential neuromuscular drift or disorientation.
   - Code defensively verifies input params (`Array.isArray`) to avoid client crashes.

3. **Lifecycle Audio & TTS Cleanup:**
   - To prevent background audio leaks and page performance issues, all dashboard subviews containing audio playback or speech synthesis implement cleanup hooks. Upon component unmounting or tab exit, they pause active HTML5 Audio objects (`readAloudAudioRef`, `activeAudioRef`, `audioRef`) and clear the browser's TTS queue (`window.speechSynthesis.cancel()`).

4. **Guided Onboarding Tour:**
   - Multi-step interactive walkthrough card customized per user role (narrator vs recipient) to orient them with core features (e.g. Recording Prompts, Vault, Cognitive Anchor, AI Voice Companion).
   - Highlights the current dashboard target with a pulsing sidebar border ring (`ring-4 ring-accent`) and inline pulsing "Guide" badges.
   - The onboarding modal features visual carousel step indicators, a skip button, contextual action tips, and a spinning sparkles micro-animation.

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
- `frontend/` — React application (Vite, Tailwind, components, pages):
  - `public/manifest.json`: PWA installation manifest.
  - `public/sw.js`: PWA cache-first service worker.
  - `src/pages/Dashboard.jsx`: Main workspace housing layout, onboarding tour, Vocal Biomarker Charts, and Cognitive Anchor DRT views.
  - `src/pages/LandingPage.jsx`: Main landing page with audio/video showcase and navbar/hero PWA download buttons.
  - `src/pages/VerifyVoice.jsx`: Narrative voice signature verification panel.
- `src/` — AI & performance layer:
  - `audio_pipeline.py`: Unified low-latency audio query engine & LRU cache.
  - `gemini_service.py`: STT, LLM chat, and clip ranking.
  - `search.py`: Fast local TF-IDF & LLM fallback search.
  - `rumik_service.py`: Wrapper calling ElevenLabs low-latency voice APIs with text normalization.
  - `guardrails.py`: Chatbot system prompts and regex backstop.
- `scripts/living_legacy_migration.sql` — Supabase database schema and RLS policies.
- `.env` — API keys and configuration settings.
