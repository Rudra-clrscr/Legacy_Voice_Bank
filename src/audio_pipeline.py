"""
Unified High-Performance Audio Engine for Living Legacy.

Provides an optimized, robust pipeline for speech-to-text, semantic retrieval,
and text-to-speech with minimum latency guarantees:

1. Text-Fast-Track: Bypasses STT if client provided live browser transcript (0ms STT).
2. LRU Query Cache: Instant 0ms cache hits for repeated voice queries.
3. Concurrent STT & DB Prefetch: Parallelized async I/O.
4. Fast Local Retrieval: Local TF-IDF search (<1ms) with LLM fallback.
5. Multi-tier Audio Synthesis Fallback: ElevenLabs Clone -> Rumik TTS -> Original Audio URL.
"""

import os
import time
import base64
import asyncio
import logging
from typing import Optional, Dict, Any, List

from src.gemini_service import transcribe_audio_async, chat_completion_async
from src.search import retrieve_relevant_clip
from src.rumik_service import generate_tts_audio

logger = logging.getLogger("audio_pipeline")

def parse_release_date(date_str: str):
    import datetime
    if not date_str:
        return datetime.datetime.now(datetime.timezone.utc)
    cleaned = date_str.replace('Z', '+00:00')
    try:
        return datetime.datetime.fromisoformat(cleaned)
    except ValueError:
        for fmt in (
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%d %H:%M:%S.%f%z",
            "%Y-%m-%d %H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
        ):
            try:
                dt = datetime.datetime.strptime(cleaned, fmt)
                if not dt.tzinfo:
                    dt = dt.replace(tzinfo=datetime.timezone.utc)
                return dt
            except ValueError:
                continue
        return datetime.datetime.max.replace(tzinfo=datetime.timezone.utc)

# ─── Simple In-Memory LRU Cache for Voice Queries ────────────────────────────
_QUERY_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_MAX_SIZE = 100
_CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_cache_key(user_id: str, query: str) -> str:
    cleaned = (query or "").strip().lower()
    return f"{user_id}:{cleaned}"


def _get_cached_response(user_id: str, query: str) -> Optional[Dict[str, Any]]:
    key = _get_cache_key(user_id, query)
    entry = _QUERY_CACHE.get(key)
    if not entry:
        return None
    if time.time() - entry["timestamp"] > _CACHE_TTL_SECONDS:
        del _QUERY_CACHE[key]
        return None
    return entry["data"]


def _set_cached_response(user_id: str, query: str, data: Dict[str, Any]):
    if len(_QUERY_CACHE) >= _CACHE_MAX_SIZE:
        # Simple FIFO eviction
        oldest = next(iter(_QUERY_CACHE))
        del _QUERY_CACHE[oldest]
    
    key = _get_cache_key(user_id, query)
    _QUERY_CACHE[key] = {
        "timestamp": time.time(),
        "data": data
    }


# ─── Unified Audio Pipeline Engine ──────────────────────────────────────────

async def process_unified_voice_query(
    user_id: str,
    user_email: str,
    audio_bytes: Optional[bytes],
    mime_type: str = "audio/webm",
    client_text_query: Optional[str] = None,
    supabase_client: Any = None
) -> Dict[str, Any]:
    """
    Executes the end-to-end voice query pipeline with minimum latency.
    
    Parameters:
    - user_id: ID of the current authenticated user.
    - user_email: Email of the current authenticated user.
    - audio_bytes: Raw recorded audio payload (optional if client_text_query provided).
    - mime_type: Audio MIME type (e.g. 'audio/webm', 'audio/wav').
    - client_text_query: Optional pre-transcribed text from browser Web Speech API.
    - supabase_client: Supabase client instance.
    """
    t_start = time.time()
    
    # ── Step 1: Text-Fast-Track vs STT Execution ──────────────────────────────
    query_text = (client_text_query or "").strip()
    stt_method = "browser_fast_track" if query_text else "gemini_stt"
    
    # Define parallel DB prefetch function
    def _fetch_db_context():
        profile_resp = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
        profile = profile_resp.data[0] if profile_resp.data else {}
        role = profile.get("role", "narrator")
        
        if role == "narrator":
            all_clips = supabase_client.table("clips").select("*").eq("patient_id", user_id).execute()
            return profile, role, all_clips.data or [], profile, [], {}
        else:
            connections = supabase_client.table("recipients").select("id, patient_id").eq("email", user_email).execute()
            if not connections.data:
                return profile, role, [], None, [], {}
            
            patient_ids = [c["patient_id"] for c in connections.data]
            recipient_ids = [c["id"] for c in connections.data]
            
            all_clips = supabase_client.table("clips").select("*").in_("patient_id", patient_ids).execute()
            grants = supabase_client.table("access_grants").select("clip_id").in_("recipient_id", recipient_ids).execute()
            granted_ids = {g["clip_id"] for g in grants.data} if grants.data else set()
            
            import datetime
            now = datetime.datetime.now(datetime.timezone.utc)
            unlocked_clips = []
            for clip in (all_clips.data or []):
                unlocked = False
                if clip.get("release_rule") == "now":
                    unlocked = True
                elif clip.get("release_rule") == "date" and clip.get("release_date"):
                    try:
                        rel_date = parse_release_date(clip["release_date"])
                        if rel_date <= now:
                            unlocked = True
                    except Exception:
                        pass
                elif clip.get("release_rule") == "event":
                    unlocked = True
                    
                if unlocked and (clip.get("visibility") in ["shared", "family_archive"] or clip.get("id") in granted_ids):
                    unlocked_clips.append(clip)
            
            # Fetch profiles for all patient_ids to prevent cross-narrator clone mismatch
            narrators_resp = supabase_client.table("profiles").select("*").in_("id", patient_ids).execute()
            narrators_dict = {n["id"]: n for n in narrators_resp.data} if narrators_resp.data else {}
            
            first_id = patient_ids[0] if patient_ids else None
            narrator = narrators_dict.get(first_id)
            return profile, role, unlocked_clips, narrator, connections.data, narrators_dict

    # Run STT & DB prefetch concurrently
    if query_text:
        # Fast track: bypass STT audio upload entirely
        profile, role, searchable_clips, narrator, connections_data, narrators_dict = await asyncio.to_thread(_fetch_db_context)
    else:
        # Audio provided: STT + DB prefetch in parallel
        if not audio_bytes or len(audio_bytes) < 64:
            return {
                "user_transcript": "[No audio recorded]",
                "found": False,
                "message": "No audio input was received. Please record your message and try again.",
                "audio_available": False,
                "latency_ms": round((time.time() - t_start) * 1000, 2)
            }
        
        try:
            query_text, (profile, role, searchable_clips, narrator, connections_data, narrators_dict) = await asyncio.gather(
                transcribe_audio_async(audio_bytes, mime_type=mime_type),
                asyncio.to_thread(_fetch_db_context)
            )
        except Exception as e:
            logger.error(f"[Audio Pipeline] Parallel STT/DB prefetch error: {e}")
            return {
                "user_transcript": "[Transcription Error]",
                "found": False,
                "message": "Unable to transcribe voice query right now.",
                "audio_available": False,
                "latency_ms": round((time.time() - t_start) * 1000, 2)
            }

    if not query_text or not query_text.strip() or query_text.startswith("This is a simulated transcript"):
        return {
            "user_transcript": "[Unclear audio]",
            "found": False,
            "message": "We couldn't transcribe your query clearly. Please try speaking again.",
            "audio_available": False,
            "latency_ms": round((time.time() - t_start) * 1000, 2)
        }

    # Check cache for identical query
    cached = _get_cached_response(user_id, query_text)
    if cached:
        cached_res = dict(cached)
        cached_res["latency_ms"] = round((time.time() - t_start) * 1000, 2)
        cached_res["cached"] = True
        return cached_res

    if not searchable_clips:
        res = {
            "user_transcript": query_text,
            "found": False,
            "message": "No unlocked memory recordings are available for searching.",
            "audio_available": False,
            "stt_method": stt_method,
            "latency_ms": round((time.time() - t_start) * 1000, 2)
        }
        _set_cached_response(user_id, query_text, res)
        return res

    # ── Step 2: Semantic Retrieval (<1ms TF-IDF -> LLM Fallback) ──────────────
    search_result = retrieve_relevant_clip(query_text, searchable_clips)
    
    if not (search_result.get("found") and search_result.get("clip_id")):
        res = {
            "user_transcript": query_text,
            "found": False,
            "message": "We couldn't find a matching voice recording for your question.",
            "audio_available": False,
            "search_method": search_result.get("method", "hybrid"),
            "latency_ms": round((time.time() - t_start) * 1000, 2)
        }
        _set_cached_response(user_id, query_text, res)
        return res

    matched_clip = next((c for c in searchable_clips if c["id"] == search_result["clip_id"]), None)
    if not matched_clip:
        res = {
            "user_transcript": query_text,
            "found": False,
            "message": "Matched recording details could not be retrieved.",
            "audio_available": False,
            "latency_ms": round((time.time() - t_start) * 1000, 2)
        }
        return res

    clip_payload = {
        "id": matched_clip["id"],
        "title": matched_clip.get("title", "Voice Memory"),
        "transcript": matched_clip.get("transcript", ""),
        "audio_url": matched_clip.get("audio_url", ""),
        "narrator_name": narrator.get("name", "Narrator") if narrator else "Narrator"
    }

    # ── Step 3: Audio Synthesis Tier Hierarchy ──────────────────────────────
    # Tier 1: Rumik Silk TTS (synthesize generic voice for the transcript)
    # Tier 2: Original Recorded Audio URL Fallback
    
    try:
        quote_text = matched_clip["transcript"]
        audio_data = await asyncio.to_thread(generate_tts_audio, quote_text, model="mulberry", speaker="Mia")
        res = {
            "user_transcript": query_text,
            "found": True,
            "clip": clip_payload,
            "audio_available": True,
            "audio_base64": base64.b64encode(audio_data).decode("utf-8"),
            "mime_type": "audio/mpeg",
            "synthesis_tier": "rumik_tts",
            "stt_method": stt_method,
            "latency_ms": round((time.time() - t_start) * 1000, 2)
        }
        _set_cached_response(user_id, query_text, res)
        return res
    except Exception as e:
        logger.info(f"[Audio Pipeline] TTS synthesis unavailable, falling back to original clip URL: {e}")

    # Tier 2: Return original clip audio URL
    res = {
        "user_transcript": query_text,
        "found": True,
        "clip": clip_payload,
        "audio_available": False,
        "original_audio_url": matched_clip.get("audio_url"),
        "synthesis_tier": "original_recording_url",
        "stt_method": stt_method,
        "latency_ms": round((time.time() - t_start) * 1000, 2)
    }
    _set_cached_response(user_id, query_text, res)
    return res
