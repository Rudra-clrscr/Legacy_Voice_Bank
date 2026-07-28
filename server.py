import os
import sys
import uuid
import wave
import io
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

# Load backend .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Ensure src modules can be imported
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.gemini_service import transcribe_audio
from src.rumik_service import generate_tts_audio
from src.search import retrieve_relevant_clip

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
_supabase_client = None

def get_supabase():
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError("Supabase credentials not configured in backend .env.")
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client

app = FastAPI(
    title="Living Legacy Voice Preservation API",
    description="Backend API for the Living Legacy voice preservation and interactive query platform.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create static media folder for local fallback
IS_VERCEL = "VERCEL" in os.environ
if IS_VERCEL:
    os.makedirs("/tmp/audio", exist_ok=True)
    app.mount("/api/media", StaticFiles(directory="/tmp/audio"), name="media")
else:
    os.makedirs("data/audio", exist_ok=True)
    app.mount("/api/media", StaticFiles(directory="data/audio"), name="media")

# Security Dependency
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Validates the Supabase JWT token and returns user details.
    """
    token = credentials.credentials
    try:
        client = get_supabase()
        res = client.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Authentication failed: user not found")
        return res.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid or expired session: {str(e)}")

def get_user_profile(user_id: str):
    """Retrieves the user's role and details from profiles."""
    client = get_supabase()
    try:
        resp = client.table("profiles").select("*").eq("id", user_id).execute()
        if not resp.data:
            # Fallback/create if profile isn't inserted yet
            return {"id": user_id, "role": "narrator", "name": "User"}
        return resp.data[0]
    except Exception:
        return {"id": user_id, "role": "narrator", "name": "User"}

# Helper to generate mock WAV silence
def generate_dummy_wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b'\x00' * 16000)
    return buf.getvalue()

# Helper to upload audio to Supabase Storage
def upload_audio_to_supabase(file_name: str, file_bytes: bytes, mime_type: str) -> str:
    client = get_supabase()
    try:
        bucket_name = "clips"
        # Upload
        client.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": mime_type, "x-upsert": "true"}
        )
        # Get public url
        public_url = client.storage.from_(bucket_name).get_public_url(file_name)
        return public_url
    except Exception as e:
        print(f"[Supabase Storage] Error: {e}. Falling back to local media path.")
        # Local fallback (only /tmp is writable on Vercel's serverless filesystem)
        base_dir = "/tmp/audio" if IS_VERCEL else "data/audio"
        local_path = os.path.join(base_dir, file_name)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return f"/api/media/{file_name}"


# ─── Auth & Profile Endpoints ───────────────────────────────────────────────

@app.get("/api/auth/profile")
def fetch_profile(current_user=Depends(get_current_user)):
    profile = get_user_profile(current_user.id)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": profile.get("name", "User"),
        "role": profile.get("role", "narrator")
    }

@app.put("/api/auth/profile")
def update_profile(name: str, current_user=Depends(get_current_user)):
    client = get_supabase()
    try:
        resp = client.table("profiles").update({"name": name}).eq("id", current_user.id).execute()
        return {"status": "success", "profile": resp.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── TTS & STT Endpoints ────────────────────────────────────────────────────

@app.post("/api/tts")
async def text_to_speech(body: dict):
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required")
    
    try:
        audio_content = generate_tts_audio(text, model="muga")
        return Response(content=audio_content, media_type="audio/wav")
    except Exception as e:
        print(f"[TTS Endpoint] TTS failed: {e}. Returning dummy silence.")
        dummy_wav = generate_dummy_wav()
        return Response(content=dummy_wav, media_type="audio/wav")

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Transcribes an uploaded audio file using Gemini STT."""
    audio_bytes = await file.read()
    transcript = transcribe_audio(audio_bytes, mime_type=file.content_type)
    return {"transcript": transcript}


# ─── Session Endpoints ──────────────────────────────────────────────────────

@app.get("/api/sessions")
def get_sessions(current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    
    try:
        if profile["role"] == "narrator":
            resp = client.table("sessions").select("*").eq("patient_id", current_user.id).order("created_at", desc=True).execute()
            return resp.data
        else:
            # Recipient: fetch sessions of narrators who added them
            recipient_email = current_user.email
            connections = client.table("recipients").select("patient_id").eq("email", recipient_email).execute()
            if not connections.data:
                return []
            patient_ids = [c["patient_id"] for c in connections.data]
            resp = client.table("sessions").select("*").in_("patient_id", patient_ids).order("created_at", desc=True).execute()
            return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions")
def create_session(body: dict, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can create sessions")
        
    theme = body.get("theme", "General Stories")
    facilitator = body.get("facilitator", "")
    
    try:
        resp = client.table("sessions").insert({
            "patient_id": current_user.id,
            "theme": theme,
            "facilitator": facilitator
        }).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Clip Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/clips")
def get_clips(current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    
    try:
        if profile["role"] == "narrator":
            resp = client.table("clips").select("*").eq("patient_id", current_user.id).order("created_at", desc=True).execute()
            return resp.data
        else:
            # Recipient: Get accessible clips
            recipient_email = current_user.email
            connections = client.table("recipients").select("id, patient_id").eq("email", recipient_email).execute()
            if not connections.data:
                return []
            
            patient_ids = [c["patient_id"] for c in connections.data]
            recipient_ids = [c["id"] for c in connections.data]
            
            # Fetch clips with general 'shared' visibility or explicit access_grant
            # Postgrest filtering for OR:
            # We fetch all clips for these patient_ids
            all_clips_resp = client.table("clips").select("*").in_("patient_id", patient_ids).order("created_at", desc=True).execute()
            if not all_clips_resp.data:
                return []
                
            # Filter clips:
            # 1. Unlocked (now or past release date)
            # 2. Shared visibility OR has an access grant
            # Let's get access grants for this recipient
            grants_resp = client.table("access_grants").select("clip_id").in_("recipient_id", recipient_ids).execute()
            granted_clip_ids = {g["clip_id"] for g in grants_resp.data} if grants_resp.data else set()
            
            import datetime
            now = datetime.datetime.now(datetime.timezone.utc)
            
            accessible_clips = []
            for clip in all_clips_resp.data:
                # Release check
                is_unlocked = False
                if clip["release_rule"] == "now":
                    is_unlocked = True
                elif clip["release_rule"] == "date" and clip["release_date"]:
                    rel_date = datetime.datetime.fromisoformat(clip["release_date"].replace('Z', '+00:00'))
                    if rel_date <= now:
                        is_unlocked = True
                elif clip["release_rule"] == "event":
                    # For demo: event-triggered is unlocked. In production, requires executor approval
                    is_unlocked = True

                if is_unlocked:
                    if clip["visibility"] == "shared" or clip["id"] in granted_clip_ids:
                        accessible_clips.append(clip)
                        
            return accessible_clips
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clips")
async def upload_clip(
    session_id: str = Form(...),
    title: str = Form(...),
    transcript: str = Form(...),
    release_rule: str = Form("now"),
    release_date: Optional[str] = Form(None),
    release_event_desc: Optional[str] = Form(None),
    visibility: str = Form("shared"),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can upload clips")

    # Read bytes
    audio_bytes = await file.read()
    file_uuid = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] or ".wav"
    file_name = f"{current_user.id}/{file_uuid}{file_ext}"

    try:
        # Upload to Supabase Storage or local path
        audio_url = upload_audio_to_supabase(file_name, audio_bytes, file.content_type)

        # Save clip database record
        insert_data = {
            "session_id": session_id,
            "patient_id": current_user.id,
            "title": title,
            "audio_url": audio_url,
            "transcript": transcript,
            "release_rule": release_rule,
            "visibility": visibility
        }
        if release_date:
            insert_data["release_date"] = release_date
        if release_event_desc:
            insert_data["release_event_desc"] = release_event_desc
            
        resp = client.table("clips").insert(insert_data).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/clips/{clip_id}")
def update_clip(clip_id: str, body: dict, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can update clips")
        
    try:
        # Verify ownership
        verify = client.table("clips").select("patient_id").eq("id", clip_id).execute()
        if not verify.data or verify.data[0]["patient_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="You do not own this clip")
            
        resp = client.table("clips").update(body).eq("id", clip_id).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/clips/{clip_id}")
def delete_clip(clip_id: str, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can delete clips")
        
    try:
        # Verify ownership
        verify = client.table("clips").select("patient_id").eq("id", clip_id).execute()
        if not verify.data or verify.data[0]["patient_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="You do not own this clip")
            
        client.table("clips").delete().eq("id", clip_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Recipient Endpoints ────────────────────────────────────────────────────

@app.get("/api/recipients")
def get_recipients(current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can manage recipients")
        
    try:
        resp = client.table("recipients").select("*").eq("patient_id", current_user.id).order("name").execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recipients")
def add_recipient(body: dict, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can add recipients")
        
    name = body.get("name")
    email = body.get("email")
    relationship = body.get("relationship", "")
    
    if not name or not email:
        raise HTTPException(status_code=400, detail="Name and email are required")
        
    try:
        resp = client.table("recipients").insert({
            "patient_id": current_user.id,
            "name": name,
            "email": email,
            "relationship": relationship
        }).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/recipients/{recipient_id}")
def delete_recipient(recipient_id: str, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    if profile["role"] != "narrator":
        raise HTTPException(status_code=403, detail="Only narrators can delete recipients")
        
    try:
        client.table("recipients").delete().eq("id", recipient_id).eq("patient_id", current_user.id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Access Grants Endpoints ───────────────────────────────────────────────

@app.get("/api/access_grants")
def get_access_grants(clip_id: str, current_user=Depends(get_current_user)):
    client = get_supabase()
    try:
        resp = client.table("access_grants").select("*, recipients(name, email)").eq("clip_id", clip_id).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/access_grants")
def create_access_grant(body: dict, current_user=Depends(get_current_user)):
    client = get_supabase()
    clip_id = body.get("clip_id")
    recipient_id = body.get("recipient_id")
    
    try:
        resp = client.table("access_grants").insert({
            "clip_id": clip_id,
            "recipient_id": recipient_id
        }).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/access_grants/{grant_id}")
def delete_access_grant(grant_id: str, current_user=Depends(get_current_user)):
    client = get_supabase()
    try:
        client.table("access_grants").delete().eq("id", grant_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Collaboration / Memory Wall Endpoints ──────────────────────────────────

@app.get("/api/collab")
def get_collab_items(patient_id: Optional[str] = None, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    
    target_patient_id = patient_id
    if not target_patient_id:
        if profile["role"] == "narrator":
            target_patient_id = current_user.id
        else:
            # Recipient: fetch first connected patient
            connections = client.table("recipients").select("patient_id").eq("email", current_user.email).execute()
            if not connections.data:
                return []
            target_patient_id = connections.data[0]["patient_id"]
            
    try:
        resp = client.table("collaboration_items").select("*").eq("patient_id", target_patient_id).order("created_at", desc=True).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/collab")
def create_collab_item(body: dict, current_user=Depends(get_current_user)):
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    
    patient_id = body.get("patient_id")
    if not patient_id:
        if profile["role"] == "narrator":
            patient_id = current_user.id
        else:
            # Find patient connected to recipient
            connections = client.table("recipients").select("patient_id").eq("email", current_user.email).execute()
            if not connections.data:
                raise HTTPException(status_code=400, detail="No connected patient found")
            patient_id = connections.data[0]["patient_id"]
            
    content = body.get("content")
    item_type = body.get("type", "note")
    media_url = body.get("media_url", "")
    
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
        
    try:
        resp = client.table("collaboration_items").insert({
            "patient_id": patient_id,
            "author_id": current_user.id,
            "author_name": profile.get("name", "Family Member"),
            "type": item_type,
            "content": content,
            "media_url": media_url
        }).execute()
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Ask Them Interactive Query ──────────────────────────────────────────────

@app.get("/api/ask")
def ask_question(query: str, current_user=Depends(get_current_user)):
    """
    Retrieves the most relevant clip matching the question asked by the recipient.
    Matches using local search and Gemini LLM.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
        
    client = get_supabase()
    profile = get_user_profile(current_user.id)
    
    if profile["role"] != "recipient":
        # Let narrator search their own archive for testing
        patient_ids = [current_user.id]
        recipient_ids = []
    else:
        # Recipient: find their connected patients
        connections = client.table("recipients").select("id, patient_id").eq("email", current_user.email).execute()
        if not connections.data:
            return {"found": False, "message": "You are not connected to any patient archive."}
        patient_ids = [c["patient_id"] for c in connections.data]
        recipient_ids = [c["id"] for c in connections.data]
        
    try:
        # Retrieve all clips from connected patients
        all_clips_resp = client.table("clips").select("*").in_("patient_id", patient_ids).execute()
        if not all_clips_resp.data:
            return {"found": False, "message": "No memory files exist in the vault."}
            
        # Get recipient grants
        granted_clip_ids = set()
        if recipient_ids:
            grants_resp = client.table("access_grants").select("clip_id").in_("recipient_id", recipient_ids).execute()
            granted_clip_ids = {g["clip_id"] for g in grants_resp.data} if grants_resp.data else set()
            
        # Filter down to unlocked/accessible clips
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        
        clips_for_search = []
        for clip in all_clips_resp.data:
            is_unlocked = False
            if clip["release_rule"] == "now":
                is_unlocked = True
            elif clip["release_rule"] == "date" and clip["release_date"]:
                rel_date = datetime.datetime.fromisoformat(clip["release_date"].replace('Z', '+00:00'))
                if rel_date <= now:
                    is_unlocked = True
            elif clip["release_rule"] == "event":
                is_unlocked = True

            if is_unlocked:
                if clip["visibility"] == "shared" or clip["id"] in granted_clip_ids or profile["role"] == "narrator":
                    clips_for_search.append(clip)
                    
        if not clips_for_search:
            return {"found": False, "message": "No unlocked memory files are available at this time."}

        # Run query through orchestrator
        search_result = retrieve_relevant_clip(query, clips_for_search)
        
        if search_result.get("found") and search_result.get("clip_id"):
            matched_id = search_result["clip_id"]
            # Find the matched clip details
            matched_clip = next((c for c in clips_for_search if c["id"] == matched_id), None)
            if matched_clip:
                # Fetch narrator name
                narrator_resp = client.table("profiles").select("name").eq("id", matched_clip["patient_id"]).execute()
                narrator_name = narrator_resp.data[0]["name"] if narrator_resp.data else "Your loved one"
                
                return {
                    "found": True,
                    "clip": {
                        "id": matched_clip["id"],
                        "title": matched_clip["title"],
                        "audio_url": matched_clip["audio_url"],
                        "transcript": matched_clip["transcript"],
                        "created_at": matched_clip["created_at"],
                        "narrator_name": narrator_name
                    },
                    "score": search_result.get("score", 1.0),
                    "method": search_result.get("method")
                }

        # Safe fallback
        return {
            "found": False,
            "message": "We couldn't find a recording where your loved one spoke about this. Please try asking a different question."
        }

    except Exception as e:
        print(f"[Ask Them] Query processing error: {e}")
        return {
            "found": False,
            "message": f"An error occurred while searching: {str(e)}"
        }
