import os
import requests

RUMIK_API_KEY = os.environ.get("RUMIK_API_KEY")
BASE_URL = "https://silk-api.rumik.ai"

def generate_tts_audio(text: str, model: str = "muga", speaker: str = "Mia") -> bytes:
    """
    Calls Rumik Silk TTS API to generate audio from text.
    Returns bytes of the WAV audio.
    If RUMIK_API_KEY is not set, raises ValueError.
    """
    if not RUMIK_API_KEY:
        raise ValueError("RUMIK_API_KEY is not configured in the environment.")

    headers = {
        "Authorization": f"Bearer {RUMIK_API_KEY}",
        "Content-Type": "application/json"
    }

    # If model is mulberry, we can steer it using preset speaker
    if model == "mulberry":
        payload = {
            "model": "mulberry",
            "text": text,
            "speaker": speaker,
            "f0_up_key": 0
        }
    else:
        # Default is muga, we can prepend a style tag
        # e.g., "[neutral] Text"
        style_prefix = "[neutral]"
        if not text.startswith("["):
            text = f"{style_prefix} {text}"
            
        payload = {
            "model": "muga",
            "text": text
        }

    response = requests.post(f"{BASE_URL}/v1/tts", headers=headers, json=payload, timeout=20)
    response.raise_for_status()
    
    return response.content
