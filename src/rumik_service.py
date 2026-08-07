import os
import re
import requests

# Re-use ELEVENLABS_API_KEY in place of RUMIK_API_KEY
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
BASE_URL = "https://api.elevenlabs.io/v1"

_session = requests.Session()

# Mappings for legacy Mulberry/Muga speakers to ElevenLabs voice IDs
# Includes warm emotional Hindi/Indian-English voices that fit the project context
VOICE_MAP = {
    "Mia": "dVTC43Yewy5fAIcmsISI",        # Anvi - Warm, Emotional (Female, Indian)
    "Sarah": "EXAVITQu4vr4xnSDxMaL",      # Sarah - Mature, Reassuring
    "Roger": "CwhRBWXzGAHq8TQ4Fs17",      # Roger - Laid-back, Resonant
    "Dev": "fUETXWzFCITxS1nr7ZBQ",        # Dev Saxena (Male, Indian)
    "Raghunath": "5zF1TbE0DZnoPXEaDT5v",   # Raghunath (Male, Indian)
    "Bella": "hpp4J3VqNfWAUOO0d1Us"        # Bella - Professional, Warm
}

def clean_text_for_elevenlabs(text: str) -> str:
    """
    Cleans raw dialogue text by removing TTS tone/style tags and replacing 
    inline events with asterisk notations so ElevenLabs reads them naturally.
    """
    if not text:
        return ""
    # 1. Remove tone tags like [happy], [excited], [sad], [angry], [neutral], [whisper]
    text = re.sub(r'\[(happy|excited|sad|angry|neutral|whisper)\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*\[[a-zA-Z0-9\s_-]+\]', '', text)
    text = re.sub(r'\n\s*\[[a-zA-Z0-9\s_-]+\]', '\n', text)
    
    # 2. Replace inline events like <laugh>, <chuckle>, <sigh> with asterisks
    text = re.sub(r'<laugh>', ' *laughs* ', text, flags=re.IGNORECASE)
    text = re.sub(r'<chuckle>', ' *chuckles* ', text, flags=re.IGNORECASE)
    text = re.sub(r'<sigh>', ' *sighs* ', text, flags=re.IGNORECASE)
    text = re.sub(r'<[a-zA-Z0-9\s_-]+>', '', text)
    
    # 3. Clean up multiple spaces
    text = re.sub(r' +', ' ', text)
    return text.strip()

def generate_tts_audio(text: str, model: str = "eleven_flash_v2_5", speaker: str = "Mia") -> bytes:
    """
    Calls ElevenLabs TTS API to generate audio from text.
    Returns bytes of the MP3 audio.
    If ELEVENLABS_API_KEY is not set, raises ValueError.
    """
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY is not configured in the environment.")

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }

    # Clean text to remove tone/event tags
    cleaned_text = clean_text_for_elevenlabs(text)

    # Determine voice ID (supports passing a direct 20-char ElevenLabs voice ID)
    if len(speaker) == 20 and speaker.isalnum():
        voice_id = speaker
    else:
        voice_id = VOICE_MAP.get(speaker, "dVTC43Yewy5fAIcmsISI")

    # Use eleven_flash_v2_5 as the default modern, low-latency, and cost-effective model
    model_id = "eleven_flash_v2_5"
    
    # Append output format query param (we request high-quality 128kbps MP3)
    url = f"{BASE_URL}/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    
    payload = {
        "text": cleaned_text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    response = _session.post(url, headers=headers, json=payload, timeout=20)
    response.raise_for_status()
    
    return response.content
