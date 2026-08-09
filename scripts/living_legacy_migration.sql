-- ============================================================
-- Living Legacy: Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. TABLE DEFINITIONS (Ordered by foreign key dependencies)
-- ────────────────────────────────────────────────────────────

-- 1.1 Profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('narrator', 'recipient')) DEFAULT 'narrator',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Recipients (family members added by narrator)
CREATE TABLE IF NOT EXISTS public.recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_patient_recipient_email UNIQUE (patient_id, email)
);

-- 1.3 Sessions (narrator sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    facilitator TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Clips (voice recordings, transcripts, and rules)
CREATE TABLE IF NOT EXISTS public.clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    audio_url TEXT, -- URL to Supabase storage bucket or local path
    transcript TEXT,
    release_rule TEXT NOT NULL CHECK (release_rule IN ('now', 'date', 'event', 'never')) DEFAULT 'now',
    release_date TIMESTAMPTZ,
    release_event_desc TEXT,
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared', 'family_archive')) DEFAULT 'shared',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Access Grants (individual clip sharing)
CREATE TABLE IF NOT EXISTS public.access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_clip_recipient UNIQUE (clip_id, recipient_id)
);

-- 1.6 Collaboration Items (family posts, photos, memories)
CREATE TABLE IF NOT EXISTS public.collaboration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('photo', 'note', 'memory')) DEFAULT 'note',
    content TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY (RLS) ACTIVATION
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_items ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 3. SECURITY POLICIES
-- ────────────────────────────────────────────────────────────

-- 3.1 Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3.2 Recipients Policies
CREATE POLICY "Patients can manage their recipients" ON public.recipients 
    FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Recipients can view their own connection record" ON public.recipients
    FOR SELECT USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- 3.3 Sessions Policies
CREATE POLICY "Patients can manage their own sessions" ON public.sessions 
    FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Recipients can view sessions of patients they are connected to" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recipients r 
            WHERE r.patient_id = public.sessions.patient_id 
            AND r.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
    );

-- 3.4 Clips Policies
CREATE POLICY "Patients can manage their own clips" ON public.clips 
    FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Recipients can view clips granted to them" ON public.clips
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recipients r
            JOIN public.access_grants ag ON ag.recipient_id = r.id
            WHERE ag.clip_id = public.clips.id
            AND r.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
        OR 
        (
            -- General shared visibility for connected family members (if not private)
            visibility IN ('shared', 'family_archive') AND 
            EXISTS (
                SELECT 1 FROM public.recipients r 
                WHERE r.patient_id = public.clips.patient_id 
                AND r.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
            )
        )
    );

-- 3.5 Access Grants Policies
CREATE POLICY "Patients can manage access grants" ON public.access_grants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clips c 
            WHERE c.id = public.access_grants.clip_id 
            AND c.patient_id = auth.uid()
        )
    );
CREATE POLICY "Recipients can view access grants for themselves" ON public.access_grants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recipients r 
            WHERE r.id = public.access_grants.recipient_id 
            AND r.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
    );

-- 3.6 Collaboration Items Policies
CREATE POLICY "Connected users can manage collaboration items" ON public.collaboration_items
    FOR ALL USING (
        auth.uid() = patient_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.recipients r 
            WHERE r.patient_id = public.collaboration_items.patient_id 
            AND r.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
    );

-- ────────────────────────────────────────────────────────────
-- 4. PROFILE TRIGGER FOR AUTOMATIC REGISTRATION
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'narrator')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 5. HACKATHON UPGRADES (Consent, Executors, Authenticity Registry)
-- ────────────────────────────────────────────────────────────

-- 5.1 Extend profiles table with Voice Consent Deed fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voice_consent_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voice_consent_signature TEXT, -- Stored as SVG path or Base64 SVG data
ADD COLUMN IF NOT EXISTS voice_consent_date TIMESTAMPTZ;

-- 5.2 Extend profiles table with Digital Executor fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS executor_email TEXT,
ADD COLUMN IF NOT EXISTS executor_name TEXT,
ADD COLUMN IF NOT EXISTS executor_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS executor_activated_at TIMESTAMPTZ;

-- 5.3 Create Voice Authenticity Registry table
CREATE TABLE IF NOT EXISTS public.voice_authenticity_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of the generated audio file bytes
    transcript TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.4 Enable Row Level Security (RLS) on the registry
ALTER TABLE public.voice_authenticity_registry ENABLE ROW LEVEL SECURITY;

-- 5.5 Set up Security Policies for the registry
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

-- 5.6 Add Index for rapid hash lookup
CREATE INDEX IF NOT EXISTS idx_voice_hash ON public.voice_authenticity_registry(audio_hash);


