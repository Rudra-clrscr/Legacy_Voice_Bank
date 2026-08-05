import os
import base64
import json
import requests
import httpx

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
GEMINI_MODEL = "gemini-3.5-flash-lite"   # Ultra-fast, low-latency audio model
GEMINI_BASE = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# Persistent connection pools to eliminate TCP/TLS handshake overhead
_sync_session = requests.Session()
_async_client = None

def _get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None or _async_client.is_closed:
        _async_client = httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0))
    return _async_client

# ─── Sync helpers ─────────────────────────────────────────────────────────────

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Transcribes audio bytes to text using Gemini's native audio support.
    Falls back to a mock transcript if the API key is not configured.
    """
    if not GEMINI_API_KEY:
        print("[Gemini Service] GEMINI_API_KEY not set. Using mock transcription fallback.")
        return "This is a simulated transcript. Please set GEMINI_API_KEY in your .env file to enable live Gemini transcription."

    gemini_mime = _normalize_mime(mime_type)
    payload = _build_transcribe_payload(audio_bytes, gemini_mime)

    try:
        url = f"{GEMINI_BASE}?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        response = _sync_session.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code != 200:
            print(f"[Gemini Service] Gemini API Error {response.status_code}: {response.text}")
            return "Failed to transcribe audio (API error). Please verify your API key."
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[Gemini Service] Error in transcription: {e}")
        return f"Transcription error: {str(e)}"


def chat_completion(messages: list, system_prompt: str) -> str:
    """
    Multi-turn chat completion using Gemini, with an enforced system instruction.
    messages: list of {"role": "user"|"assistant", "content": str}, oldest first.
    Falls back to a mock reply if the API key is not configured.
    """
    if not GEMINI_API_KEY:
        print("[Gemini Service] GEMINI_API_KEY not set. Using mock chat fallback.")
        return "This is a simulated assistant reply. Please set GEMINI_API_KEY in your .env file to enable live Gemini chat."

    payload = _build_chat_payload(messages, system_prompt)

    try:
        url = f"{GEMINI_BASE}?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        response = _sync_session.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code != 200:
            print(f"[Gemini Service] Chat error {response.status_code}: {response.text}")
            return "I'm having trouble responding right now. Please try again in a moment."
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[Gemini Service] Chat completion error: {e}")
        return "I'm having trouble responding right now. Please try again in a moment."


# ─── Async helpers (used by voice-loop for concurrent execution) ───────────────

async def transcribe_audio_async(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Async version of transcribe_audio. Uses connection pooling so it doesn't block.
    """
    if not GEMINI_API_KEY:
        return "This is a simulated transcript. Please set GEMINI_API_KEY in your .env file to enable live Gemini transcription."

    gemini_mime = _normalize_mime(mime_type)
    payload = _build_transcribe_payload(audio_bytes, gemini_mime)

    try:
        url = f"{GEMINI_BASE}?key={GEMINI_API_KEY}"
        client = _get_async_client()
        response = await client.post(url, json=payload)
        if response.status_code != 200:
            print(f"[Gemini Async] STT error {response.status_code}: {response.text}")
            return "Failed to transcribe audio (API error)."
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[Gemini Async] STT exception: {e}")
        return f"Transcription error: {str(e)}"


async def chat_completion_async(messages: list, system_prompt: str) -> str:
    """
    Async version of chat_completion. Uses connection pooling so it doesn't block.
    """
    if not GEMINI_API_KEY:
        return "This is a simulated assistant reply. Please set GEMINI_API_KEY in your .env file to enable live Gemini chat."

    payload = _build_chat_payload(messages, system_prompt)

    try:
        url = f"{GEMINI_BASE}?key={GEMINI_API_KEY}"
        client = _get_async_client()
        response = await client.post(url, json=payload)
        if response.status_code != 200:
            print(f"[Gemini Async] Chat error {response.status_code}: {response.text}")
            return "I'm having trouble responding right now. Please try again in a moment."
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"[Gemini Async] Chat exception: {e}")
        return "I'm having trouble responding right now. Please try again in a moment."



# ─── Clip ranking (sync — called from sync search pipeline) ───────────────────

def rank_clips_with_gemini(query: str, clips: list) -> dict:
    """
    Ranks clips against a recipient query using Gemini.
    clips is a list of dicts, each with 'id' and 'transcript'.
    Returns a dict like: {"found": bool, "clip_id": str, "score": float}
    """
    if not clips:
        return {"found": False, "clip_id": None, "score": 0.0}

    if not GEMINI_API_KEY:
        print("[Gemini Service] GEMINI_API_KEY not set. Using local fallback search.")
        return {"found": False, "clip_id": None, "score": 0.0, "error": "API key missing"}

    clips_formatted = ""
    for clip in clips:
        clips_formatted += f"Clip ID: {clip['id']}\nTranscript: {clip['transcript']}\n---\n"

    prompt = f"""You are the search and retrieval component of "Living Legacy", a voice preservation system.
A family member is asking a question to hear recorded audio of their deceased or ill loved one.
Your job is to read their question and find if any of the recorded clips contain a direct answer.

User Question: "{query}"

Recorded Clips:
{clips_formatted}

Task:
1. Determine if any of the clips contain a relevant answer to the user's question.
2. If yes, identify the single best matching Clip ID and compute a match score (between 0.0 and 1.0).
3. If no clips are relevant, set "found" to false, "clip_id" to null, and "score" to 0.0.
4. Output your decision ONLY in raw JSON format. Do not use markdown blocks.

JSON Output structure:
{{
  "found": true,
  "clip_id": "UUID_OF_THE_BEST_CLIP",
  "score": 0.85
}}
"""

    try:
        url = f"{GEMINI_BASE}?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json"
            }
        }
        headers = {"Content-Type": "application/json"}
        response = _sync_session.post(url, headers=headers, json=payload, timeout=10)

        if response.status_code != 200:
            print(f"[Gemini Service] Gemini API Error {response.status_code}: {response.text}")
            return {"found": False, "clip_id": None, "score": 0.0, "error": "API error"}

        result_data = response.json()
        response_text = result_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        decision, _ = json.JSONDecoder().raw_decode(response_text)
        return decision

    except Exception as e:
        print(f"[Gemini Service] Error ranking clips: {e}")
        return {"found": False, "clip_id": None, "score": 0.0, "error": str(e)}


# ─── Private helpers ──────────────────────────────────────────────────────────

def _normalize_mime(mime_type: str) -> str:
    if "webm" in mime_type:
        return "audio/webm"
    elif "mp3" in mime_type or "mpeg" in mime_type:
        return "audio/mp3"
    elif "ogg" in mime_type:
        return "audio/ogg"
    return "audio/wav"


def _build_transcribe_payload(audio_bytes: bytes, gemini_mime: str) -> dict:
    b64 = base64.b64encode(audio_bytes).decode("utf-8")
    return {
        "contents": [{
            "parts": [
                {
                    "text": (
                        "Transcribe this audio file accurately. Output ONLY the plain transcript. "
                        "Do not include any notes, greetings, corrections, or intro text like 'Here is the transcript:'."
                    )
                },
                {
                    "inlineData": {
                        "mimeType": gemini_mime,
                        "data": b64
                    }
                }
            ]
        }],
        "generationConfig": {"temperature": 0.0}
    }


def _build_chat_payload(messages: list, system_prompt: str) -> dict:
    contents = [
        {"role": "model" if m.get("role") == "assistant" else "user",
         "parts": [{"text": m.get("content", "")}]}
        for m in messages
        if m.get("content")
    ]
    return {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.6}
    }
