-- ============================================================
-- Pratidhvani: Digital Reminiscence Therapy (DRT) Upgrade Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Tag clips with a comfort purpose so narrators can build a categorized
--    comfort library instead of a single generic "grounding" clip.
ALTER TABLE public.clips
ADD COLUMN IF NOT EXISTS comfort_category TEXT
  CHECK (comfort_category IN ('grounding', 'nighttime', 'reassurance', 'identity', 'favorite'));

-- 2. Log each time a comfort anchor clip is played, so caregivers can see
--    whether usage clusters around sundowning hours.
CREATE TABLE IF NOT EXISTS public.comfort_anchor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comfort_anchor_logs ENABLE ROW LEVEL SECURITY;

-- Narrator can read their own logs; connected recipients can read logs for
-- patients they're linked to (mirrors collaboration_items access pattern).
CREATE POLICY "Narrator reads own comfort logs"
ON public.comfort_anchor_logs FOR SELECT USING (
    auth.uid() = patient_id
    OR EXISTS (
        SELECT 1 FROM public.recipients r
        WHERE r.patient_id = comfort_anchor_logs.patient_id
        AND r.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Narrator or a connected recipient can insert a log entry for the patient.
CREATE POLICY "Narrator or connected recipient can log comfort anchor use"
ON public.comfort_anchor_logs FOR INSERT WITH CHECK (
    auth.uid() = patient_id
    OR EXISTS (
        SELECT 1 FROM public.recipients r
        WHERE r.patient_id = comfort_anchor_logs.patient_id
        AND r.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

CREATE INDEX IF NOT EXISTS idx_comfort_logs_patient_created
ON public.comfort_anchor_logs(patient_id, created_at DESC);
