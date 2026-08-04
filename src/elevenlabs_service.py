import os
import io
import requests
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TXXX, COMM

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
BASE_URL = "https://api.elevenlabs.io/v1"

_WATERMARK_NOTICE = (
    "This audio is an AI-generated voice clone from Living Legacy, synthesized "
    "from a narrator's own recorded words with their explicit consent. It is "
    "not a genuine, unedited recording."
)


def is_configured() -> bool:
    return bool(ELEVENLABS_API_KEY)


def create_voice_clone(name: str, samples: list) -> str:
    """
    Creates an ElevenLabs Instant Voice Clone from the narrator's own recorded
    clips. `samples` is a list of (filename, bytes, content_type) tuples.
    Returns the new voice_id. Raises ValueError/HTTPError if unavailable.
    """
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY is not configured in the environment.")
    if not samples:
        raise ValueError("At least one audio sample is required to create a voice clone.")

    headers = {"xi-api-key": ELEVENLABS_API_KEY}
    files = [("files", (fname, data, ctype)) for fname, data, ctype in samples]
    data = {
        "name": name,
        "description": "Living Legacy voice clone, created with the narrator's explicit consent for family memory playback."
    }

    response = requests.post(f"{BASE_URL}/voices/add", headers=headers, data=data, files=files, timeout=60)
    response.raise_for_status()
    return response.json()["voice_id"]


def delete_voice_clone(voice_id: str) -> None:
    """Best-effort deletion when a narrator revokes consent."""
    if not ELEVENLABS_API_KEY or not voice_id:
        return
    try:
        headers = {"xi-api-key": ELEVENLABS_API_KEY}
        requests.delete(f"{BASE_URL}/voices/{voice_id}", headers=headers, timeout=20)
    except Exception as e:
        print(f"[ElevenLabs] Failed to delete voice {voice_id}: {e}")


def _tag_ai_generated(mp3_bytes: bytes) -> bytes:
    """
    Stamps explicit 'AI-generated' ID3 metadata onto the mp3 as a transparent,
    inspectable marker. This is a supplement to, not a replacement for,
    ElevenLabs' own inaudible SynthID watermark (embedded automatically by
    ElevenLabs into TTS output — see https://elevenlabs.io/blog/synthid),
    which survives trimming/re-encoding and is what actually defeats misuse
    if this audio is stripped of metadata and redistributed elsewhere.
    """
    try:
        buf = io.BytesIO(mp3_bytes)
        audio = MP3(buf, ID3=ID3)
        if audio.tags is None:
            audio.add_tags()
        audio.tags.add(TXXX(encoding=3, desc="AI-Generated", text="true"))
        audio.tags.add(TXXX(encoding=3, desc="Watermark", text="ElevenLabs-SynthID"))
        audio.tags.add(COMM(encoding=3, lang="eng", desc="", text=_WATERMARK_NOTICE))
        audio.save(buf)
        return buf.getvalue()
    except Exception as e:
        print(f"[ElevenLabs] Failed to tag AI-generated metadata (non-fatal): {e}")
        return mp3_bytes


def synthesize_with_clone(voice_id: str, text: str) -> bytes:
    """
    Synthesizes `text` verbatim in the cloned voice. Callers must only ever pass
    a narrator's own real recorded transcript text here — never LLM-generated
    commentary — to preserve the quote-only guarantee: this voice may only ever
    say words the narrator actually recorded.

    Output carries ElevenLabs' automatic SynthID watermark plus an explicit
    'AI-Generated' ID3 tag, so the audio remains identifiable as synthetic even
    if extracted and redistributed outside the app.
    """
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY is not configured in the environment.")

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
    response = requests.post(f"{BASE_URL}/text-to-speech/{voice_id}", headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return _tag_ai_generated(response.content)
