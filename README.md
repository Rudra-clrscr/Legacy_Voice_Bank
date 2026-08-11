# Pratidhvani — Voice Preservation & Cognitive Care Sanctuary

**Pratidhvani** (*"echo/resonance"* — formerly *"Living Legacy"*) is an interactive voice-preservation, interactive-query, and Digital Reminiscence Therapy (DRT) platform. It allows narrators to record and index their life stories, enables family members to semantically query their memories, and offers interactive cognitive care tools for individuals experiencing memory loss, Dementia, or Alzheimer's.

---

## ⚠️ The Problem

1. **Lost Legacies & Wisdom**: A person's unique voice, life stories, and memories are often lost when they pass away. Traditional audio/video recordings are static, linear, and difficult to navigate.
2. **Cognitive & Neuromuscular Decline**: Conditions such as Alzheimer's, Dementia, and sundowning create periods of acute disorientation. Families lack immediate, non-pharmacological grounding tools to soothe their loved ones using familiar stimuli.
3. **Tracking Progression**: Identifying cognitive or motor-speech decline early is hard without stressful clinical assessments.
4. **Disjointed Reminiscence**: Preserved memories are often scattered across voice memos, photo albums, and message chains rather than integrated chronologically for sensory stimulation.

---

## 🌟 Our Solution

**Pratidhvani** transforms static recordings into an interactive, living archive that serves both as a legacy vault and a clinical grounding aid. 

- **Authentic Voice Queries**: Family members ask questions in plain language (e.g., *"Tell me about your first job"*) and instantly hear the narrator's **original recorded audio clip** where they discussed it.
- **Companion Conversation Loop**: When interactive prompting is needed, an AI companion chats with users, synthesizing responses in the **narrator's cloned voice** (built on ElevenLabs and guarded by a multi-level cryptographic consent protocol).
- **Cognitive Anchoring & DRT**: Provides immediate orientation comfort via a visual-vocal breathing guide and a shared chronological timeline of voice clips, notes, and photos.
- **Passive Vocal Biomarkers**: Measures speech micro-dynamics over time to track neuromuscular clarity, offering early warnings of cognitive or motor fluctuations.
- **Offline Legacy Capsule**: Configured as an installable PWA with offline caching and standalone exports so families always have access to their sanctuary.

---

## 🛠 Features

### 1. Unified Audio Pipeline & Search
*   **Zero-latency Fast-Track**: Live browser transcription text bypasses server-side STT for instant 0ms query roundtrips.
*   **Hybrid Search Engine**: Instantly queries clips using a local TF-IDF matcher (<1ms) and falls back to Gemini LLM semantic ranking only when local search is inconclusive.
*   **LRU Query Cache**: Caches frequent voice responses to ensure immediate playback.

### 2. Cognitive Care & Digital Reminiscence Therapy (DRT)
*   **Immediate Comfort Anchor**: A prominent, single-press "Anchor Me" button to stream the narrator's pre-recorded grounding audio message.
*   **Concentric Breathing Guide**: Synchronized visual circles that expand and contract on a 4-second cycle, helping disoriented individuals synchronize their breathing and reduce anxiety during panic episodes.
*   **Sensory Memory Lane**: A blended chronological lane that brings together recorded voice memories and collaborative family uploads (notes, annotations, and uploaded photos) to rebuild context.

### 3. Vocal Biomarker Monitoring
*   **Speech Metrics Extraction**: Extracts longitudinal metrics (clarity score, pitch, jitter, shimmer, and signal-to-noise ratio) for each recording.
*   **Neobrutalist Line Chart**: A custom-built SVG visualization tracking voice stability over time.
*   **Early Drift Alerts**: Triggers a biomarker drift warning if a progressive decline of >8% from the baseline is detected, helping families track early indicators of neuromuscular or cognitive changes.

### 4. Cryptographic Trust & Safety
*   **Printable Certificates**: Generates signed cryptographic authenticity certificates for voice records to guarantee origin and prevent deepfake spoofing.
*   **Consent Signatures**: A binding narrator-signed digital consent registry that manages global voice cloning permissions, paired with per-recipient access switches.
*   **Lifecycle Audio Guard**: Prevents background audio leaks by pausing all HTML5 players and terminating `speechSynthesis` queues immediately upon tab unmount.

### 5. Progressive Web App (PWA)
*   **Universal Installer**: Prompts installation buttons in the Landing Page Navbar, Hero section, and Dashboard Sidebar.
*   **Device-Specific Guidance**: Detects Safari (iOS), Firefox, and Chrome/Edge on unsupported browsers to show step-by-step custom instruction toasts (e.g., tap Share 📤 then *'Add to Home Screen'* 📱).
*   **Asset Offline Caching**: Registers `sw.js` and `manifest.json` to keep essential routes and branding assets cached locally.

### 6. Role-Aware Interactive Tour
*   **Custom Persona Walks**: Walkthroughs tailored dynamically to Narrator vs Recipient roles.
*   **Visual Step Indicators**: Carousel progress dots, contextual action tips, and a spinning sparkles micro-animation.
*   **Pulsing Focus Rings**: Sidebar items are automatically wrapped in a pulsing highlight ring (`ring-4 ring-accent`) and marked with flashing "Guide" badges during active tour steps.

---

## 📂 Project Structure & Key Modules

*   **`server.py`**: The FastAPI server handling JWT authentication, Supabase integrations, metadata, and chatbot endpoints.
*   **`src/audio_pipeline.py`**: High-performance audio execution engine integrating ElevenLabs, Rumik TTS, and Gemini.
*   **`src/rumik_service.py`**: Dialogue tag parser and wrapper for ElevenLabs `eleven_flash_v2_5` low-latency synthesis.
*   **`src/search.py`**: Blended TF-IDF and LLM-fallback hybrid search algorithm.
*   **`frontend/src/pages/Dashboard.jsx`**: The main interface surface housing the recording studios, Vault, Collaboration Wall, Vocal Biomarker Graph, and DRT Cognitive Anchor.
*   **`frontend/src/pages/LandingPage.jsx`**: Marketing and overview page featuring direct PWA installer nodes.
*   **`frontend/public/sw.js` & `manifest.json`**: Service Worker and Web App Manifest details.
