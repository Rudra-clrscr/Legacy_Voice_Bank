import os
import base64
import json
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """
    Transcribes audio bytes to text using Gemini's native audio support.
    Falls back to a mock transcript if the API key is not configured.
    """
    if not GEMINI_API_KEY:
        print("[Gemini Service] GEMINI_API_KEY not set. Using mock transcription fallback.")
        return "This is a simulated transcript. Please set GEMINI_API_KEY in your .env file to enable live Gemini transcription."

    # Standardize mimeType for Gemini (e.g. webm audio often maps to audio/webm or audio/ogg)
    # Gemini accepts: audio/wav, audio/mp3, audio/ogg, audio/webm, etc.
    if "webm" in mime_type:
        gemini_mime = "audio/webm"
    elif "mp3" in mime_type or "mpeg" in mime_type:
        gemini_mime = "audio/mp3"
    elif "ogg" in mime_type:
        gemini_mime = "audio/ogg"
    else:
        gemini_mime = "audio/wav"

    try:
        # Base64 encode the audio data
        base64_audio = base64.b64encode(audio_bytes).decode("utf-8")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
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
                                "data": base64_audio
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
            }
        }
        
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            print(f"[Gemini Service] Gemini API Error {response.status_code}: {response.text}")
            return "Failed to transcribe audio (API error). Please verify your API key."

        data = response.json()
        transcript = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return transcript

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

    contents = [
        {"role": "model" if m.get("role") == "assistant" else "user", "parts": [{"text": m.get("content", "")}]}
        for m in messages
        if m.get("content")
    ]
    if not contents:
        return "I didn't catch a message there — could you try again?"

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.6}
    }

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            print(f"[Gemini Service] Chat error {response.status_code}: {response.text}")
            return "I'm having trouble responding right now. Please try again in a moment."

        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    except Exception as e:
        print(f"[Gemini Service] Chat completion error: {e}")
        return "I'm having trouble responding right now. Please try again in a moment."


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

    # Format the clips for the LLM
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
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json"
            }
        }
        
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code != 200:
            print(f"[Gemini Service] Gemini API Error {response.status_code}: {response.text}")
            return {"found": False, "clip_id": None, "score": 0.0, "error": "API error"}

        result_data = response.json()
        response_text = result_data["candidates"][0]["content"]["parts"][0]["text"].strip()

        # Gemini's structured JSON output occasionally appends stray trailing
        # data (e.g. a duplicated closing brace). raw_decode parses the first
        # valid JSON value and ignores anything after it, instead of failing.
        decision, _ = json.JSONDecoder().raw_decode(response_text)
        return decision

    except Exception as e:
        print(f"[Gemini Service] Error ranking clips: {e}")
        return {"found": False, "clip_id": None, "score": 0.0, "error": str(e)}
