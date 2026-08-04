# Pratidhvani (formerly "Living Legacy") - Project Context

## Project Overview
**Pratidhvani** ("echo/resonance" — the app was renamed from "Living Legacy") is a
voice-preservation and interactive-query platform. A **narrator** (typically an
elderly or ill person) records short audio clips answering life-story prompts.
Family **recipients** can browse those clips, ask a question in plain language to
have the platform find and play back the clip where their loved one addressed it,
or talk to two flavors of AI companion built on top of the archive (see below).
Clips can be locked behind release rules (immediately, on a future date, or on a
life event) and shared either broadly or with individually granted recipients.

## Architecture
Full-stack app deployed on Vercel, with Supabase as the backing database/auth/storage.

1. **Frontend (`/frontend`):**
   - **React 19** (Vite 8), **Tailwind CSS**, **Framer Motion** for animation.
   - **Recharts** for any in-dashboard charts, **react-router-dom** for routing,
     **react-hot-toast** for notifications, **PostHog** for analytics.
   - Routes ([App.jsx](frontend/src/App.jsx)): `/` (`LandingPage.jsx`, marketing page
     with video background), `/login` (`Login.jsx`), `/dashboard` (`Dashboard.jsx`,
     protected — main app surface for recording, browsing, and querying clips). The
     Pratidhvani logo in both the Dashboard header and Login page links back to `/`.
   - Auth/session handled by `hooks/useAuth.jsx` against Supabase; `lib/supabase.js`
     and `lib/posthog.js` hold the respective client setups.

2. **Backend (`server.py`, mounted for Vercel via `api/index.py`):**
   - **FastAPI** app bridging the frontend to Supabase and the AI services.
   - Auth: validates the Supabase JWT bearer token per-request
     (`get_current_user` in [server.py](server.py)) and looks up the caller's
     `profiles` row for their role (`narrator` or `recipient`).
   - Audio storage: uploads to the Supabase Storage `clips` bucket, falling back to
     local disk (`/tmp/audio` on Vercel, `data/audio` locally) if storage fails.

## AI / Services Layer (`/src`)
- **`gemini_service.py`:** Gemini calls for (a) audio → transcript (`transcribe_audio`),
  (b) ranking a recipient's question against clip transcripts (`rank_clips_with_gemini`,
  parsed defensively with `json.JSONDecoder().raw_decode` since Gemini's structured
  output occasionally appends stray trailing data), and (c) multi-turn chat completion
  (`chat_completion`) used by the Companion assistant. All gracefully fall back to
  mock/error responses when `GEMINI_API_KEY` is unset.
- **`rumik_service.py`:** Rumik Silk TTS API (`generate_tts_audio`) — generic-voice
  text-to-speech, used for recording-prompt playback and the Companion's read-aloud.
  Rumik only offers preset voices; it cannot clone a specific person's voice.
- **`elevenlabs_service.py`:** ElevenLabs Instant Voice Cloning — `create_voice_clone`
  (builds a clone from a narrator's own clip audio), `delete_voice_clone` (consent
  revocation), `synthesize_with_clone` (quote-only: callers must only ever pass a
  narrator's real transcript text, never LLM-generated text). Output is tagged with
  an explicit `AI-Generated`/`Watermark` ID3 comment on top of ElevenLabs' own
  automatic, inaudible SynthID watermark.
- **`guardrails.py`:** Safety layer for the Companion chatbot — `build_system_prompt`
  (role-aware: narrator vs. recipient, absolute no-profanity/no-impersonation rules
  that override any user jailbreak attempt) and `enforce_guardrails` (regex backstop
  that swaps in a safe canned reply if a profanity/slur slips through anyway).
- **`search.py`:** Retrieval orchestrator (`retrieve_relevant_clip`) — tries Gemini
  ranking first, falls back to local TF-IDF cosine-similarity search
  (`local_tfidf_search`) over clip transcripts if Gemini is unavailable or finds
  nothing.

## The Companion (two modes, recipient-facing; narrators get Mode 1 only)
- **Mode 1 — Talking Assistant** (`/api/assistant/chat`): a safety-restricted Gemini
  chat. Narrators get a recording-idea brainstorm partner. Recipients get a guide
  that only ever quotes the narrator's real recorded words (never invents new
  sentences attributed to them) and can read any reply aloud via generic Rumik TTS.
- **Mode 2 — Voice Clone Assistant** (`/api/assistant/voice-chat`): opt-in, framed as
  comfort during grief rather than a treatment/therapy claim. Gated two ways: the
  narrator's global `voice_clone_consent` toggle (builds the ElevenLabs clone from up
  to 5 of their clips) AND a per-recipient `voice_clone_enabled` grant — both must be
  on. Strictly quote-only: the clone is only ever handed a matched clip's transcript
  text verbatim, structurally (not just via prompt instruction) — there is no code
  path where LLM-generated text reaches the clone. Every response carries an explicit
  "AI Voice Clone" disclosure badge and a short note pointing to real grief support.

## API Surface (`server.py`)
- `GET/PUT /api/auth/profile` — fetch/update the current user's profile.
- `PUT /api/auth/voice-consent` — narrator toggles global voice clone consent (builds/
  deletes the ElevenLabs clone).
- `POST /api/tts`, `POST /api/transcribe` — text-to-speech and speech-to-text.
- `GET/POST /api/sessions` — narrator recording sessions (grouped by theme).
- `GET/POST/PUT/DELETE /api/clips` — clip CRUD; narrator-owned, with recipient reads
  filtered by `release_rule`/`release_date`/`visibility`/`access_grants`.
- `GET/POST/DELETE /api/recipients` — narrator's family member connections.
- `PUT /api/recipients/{id}/voice-clone` — narrator grants/revokes one recipient's
  access to Mode 2 (requires global consent to already be on).
- `GET/POST/DELETE /api/access_grants` — per-clip sharing grants to specific recipients.
- `GET/POST /api/collab` — "memory wall" collaboration items (photos/notes/memories).
- `GET /api/ask` — free-text query → best-matching unlocked clip (the original,
  pre-Companion retrieval endpoint; still used by the "Ask Them" recipient tab).
- `POST /api/assistant/chat` — Companion Mode 1 (see above).
- `GET /api/recipient/companion-status` — tells a recipient whether their connected
  narrator's name and Mode 2 availability (both gates combined).
- `POST /api/assistant/voice-chat` — Companion Mode 2 (see above).

## Data Layer (Supabase / Postgres)
Schema lives in [scripts/living_legacy_migration.sql](scripts/living_legacy_migration.sql)
(filename predates the rename). Tables: `profiles` (role: narrator/recipient, linked
1:1 to `auth.users` via trigger; `voice_clone_consent`/`voice_clone_id` for Mode 2),
`sessions`, `clips` (`release_rule`, `release_date`, `release_event_desc`,
`visibility`), `recipients` (`voice_clone_enabled` per-recipient gate),
`access_grants`, `collaboration_items`. Row Level Security is enabled on every table,
mirroring the ownership/connection rules enforced in `server.py`. The migration file
is idempotent for table/column creation (`IF NOT EXISTS`) but `CREATE POLICY` is not —
re-running the whole file after policies already exist will error; run only the new
trailing section when adding incremental changes.

## File Structure & Responsibilities
- `server.py` — main FastAPI application and all route handlers.
- `api/index.py` — thin Vercel entrypoint that imports `server.app`.
- `frontend/` — entire React application (routes, hooks, lib clients, styling).
- `src/` — AI/service layer: Gemini (STT + ranking + chat), Rumik (generic TTS),
  ElevenLabs (voice cloning), guardrails (Companion safety layer), search orchestration.
- `scripts/living_legacy_migration.sql` — Supabase schema, RLS policies, auto-profile
  trigger, and voice-clone columns. `scripts/supabase_migration.sql` is an earlier/
  partial migration; `scripts/preprocess_and_upload.py` and
  `scripts/test_db_connection.py` are one-off utility scripts.
- `.env` — environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `RUMIK_API_KEY`,
  `ELEVENLABS_API_KEY`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`).
- `vercel.json` — builds `frontend/` and rewrites `/api/*` to the FastAPI entrypoint.

## Note on unrelated leftover files
`answers/`, `data/raw/*.csv`, `graph.html`, and `lib/` (vis-network, tom-select) are
remnants of an earlier, unrelated project idea (a CERT-dataset insider-threat
detection system) and are not part of the current application. They predate the
current git history and can likely be removed.
