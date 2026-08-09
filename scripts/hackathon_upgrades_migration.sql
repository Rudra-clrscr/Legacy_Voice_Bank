-- ============================================================
-- Living Legacy: Hackathon Upgrades Migration Script
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Extend profiles table with Voice Consent Deed fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voice_consent_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voice_consent_signature TEXT, -- Stored as SVG path or Base64 SVG data
ADD COLUMN IF NOT EXISTS voice_consent_date TIMESTAMPTZ;

-- 2. Extend profiles table with Digital Executor fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS executor_email TEXT,
ADD COLUMN IF NOT EXISTS executor_name TEXT,
ADD COLUMN IF NOT EXISTS executor_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS executor_activated_at TIMESTAMPTZ;

-- 3. Create Voice Authenticity Registry table
CREATE TABLE IF NOT EXISTS public.voice_authenticity_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of the generated audio file bytes
    transcript TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) on the registry
ALTER TABLE public.voice_authenticity_registry ENABLE ROW LEVEL SECURITY;

-- 5. Set up Security Policies for the registry
-- Anyone can read to verify a hash, but only system-level operations (authenticated users/service) can insert.
CREATE POLICY "Public read for authenticity verification" 
ON public.voice_authenticity_registry FOR SELECT USING (true);

CREATE POLICY "Enable insert for profiles"
ON public.voice_authenticity_registry FOR INSERT WITH CHECK (
    auth.uid() = patient_id OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'narrator'
    )
);

-- 6. Add Index for rapid hash lookup
CREATE INDEX IF NOT EXISTS idx_voice_hash ON public.voice_authenticity_registry(audio_hash);
