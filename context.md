# Living Legacy (Voice Bank) - Project Context

## Project Overview
**Living Legacy** is a voice-preservation and interactive-query platform. A **narrator**
(typically an elderly or ill person) records short audio clips answering life-story
prompts. Family **recipients** can later browse those clips, or simply ask a question
in plain language and have the platform find and play back the clip where their loved
one addressed it — optionally synthesized/read aloud via TTS. Clips can be locked
behind release rules (immediately, on a future date, or on a life event) and shared
either broadly or with individually granted recipients.

## Architecture
Full-stack app deployed on Vercel, with Supabase as the backing database/auth/storage.

1. **Frontend (`/frontend`):**
   - **React 19** (Vite 8), **Tailwind CSS**, **Framer Motion** for animation.
   - **Recharts** for any in-dashboard charts, **react-router-dom** for routing,
     **react-hot-toast** for notifications, **PostHog** for analytics.
   - Routes ([App.jsx](frontend/src/App.jsx)): `/` (`LandingPage.jsx`, marketing page
     with video background), `/login` (`Login.jsx`), `/dashboard` (`Dashboard.jsx`,
     protected — main app surface for recording, browsing, and querying clips).
   - Auth/session handled by `hooks/useAuth.jsx` against Supabase; `lib/supabase.js`
     and `lib/posthog.js` hold the respective client setups.

2. **Backend (`server.py`, mounted for Vercel via `api/index.py`):**
   - **FastAPI** app ("Living Legacy Voice Preservation API") bridging the frontend
     to Supabase and the AI services.
   - Auth: validates the Supabase JWT bearer token per-request
     (`get_current_user` in [server.py](server.py)) and looks up the caller's
     `profiles` row for their role (`narrator` or `recipient`).
   - Audio storage: uploads to the Supabase Storage `clips` bucket, falling back to
     local disk (`/tmp/audio` on Vercel, `data/audio` locally) if storage fails.

## AI / Services Layer (`/src`)
- **`gemini_service.py`:** Calls Gemini for (a) audio → transcript (`transcribe_audio`)
  and (b) ranking a recipient's question against a narrator's clip transcripts to find
  the best match (`rank_clips_with_gemini`). Both gracefully fall back to mock/error
  responses when `GEMINI_API_KEY` is unset.
- **`rumik_service.py`:** Calls the Rumik Silk TTS API (`generate_tts_audio`) to turn
  text into spoken audio for the "ask them" experience.
- **`search.py`:** Retrieval orchestrator (`retrieve_relevant_clip`) — tries Gemini
  ranking first, falls back to a local TF-IDF cosine-similarity search
  (`local_tfidf_search`) over clip transcripts if Gemini is unavailable or finds
  nothing.

## API Surface (`server.py`)
- `GET/PUT /api/auth/profile` — fetch/update the current user's profile.
- `POST /api/tts`, `POST /api/transcribe` — text-to-speech and speech-to-text.
- `GET/POST /api/sessions` — narrator recording sessions (grouped by theme).
- `GET/POST/PUT/DELETE /api/clips` — clip CRUD; narrator-owned, with recipient reads
  filtered by `release_rule`/`release_date`/`visibility`/`access_grants`.
- `GET/POST/DELETE /api/recipients` — narrator's family member connections.
- `GET/POST/DELETE /api/access_grants` — per-clip sharing grants to specific recipients.
- `GET/POST /api/collab` — "memory wall" collaboration items (photos/notes/memories)
  shared between a narrator and their connected recipients.
- `GET /api/ask` — the core interactive-query endpoint: takes a recipient's free-text
  question, filters to clips they're allowed to see and that are currently unlocked,
  and runs `retrieve_relevant_clip` to find the best-matching answer.

## Data Layer (Supabase / Postgres)
Schema lives in [scripts/living_legacy_migration.sql](scripts/living_legacy_migration.sql).
Tables: `profiles` (role: narrator/recipient, linked 1:1 to `auth.users` via trigger),
`sessions`, `clips` (with `release_rule`, `release_date`, `release_event_desc`,
`visibility`), `recipients`, `access_grants`, `collaboration_items`. Row Level Security
is enabled on every table, mirroring the same ownership/connection rules enforced in
`server.py`.

## File Structure & Responsibilities
- `server.py` — main FastAPI application and all route handlers.
- `api/index.py` — thin Vercel entrypoint that imports `server.app`.
- `frontend/` — entire React application (routes, hooks, lib clients, styling).
- `src/` — AI/service layer: Gemini (STT + ranking), Rumik (TTS), search orchestration.
- `scripts/living_legacy_migration.sql` — Supabase schema, RLS policies, and the
  auto-profile-creation trigger. `scripts/supabase_migration.sql` is an earlier/partial
  migration; `scripts/preprocess_and_upload.py` and `scripts/test_db_connection.py` are
  one-off utility scripts.
- `.env` — environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `RUMIK_API_KEY`,
  `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`).
- `vercel.json` — builds `frontend/` and rewrites `/api/*` to the FastAPI entrypoint.

## Note on unrelated leftover files
`answers/`, `data/raw/*.csv`, `graph.html`, and `lib/` (vis-network, tom-select) are
remnants of an earlier, unrelated project idea (a CERT-dataset insider-threat
detection system) and are not part of the current Living Legacy application. They
predate the current git history and can likely be removed.
