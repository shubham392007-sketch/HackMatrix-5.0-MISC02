-- Migration: 20260928_feature2_trajectories.sql
-- Description: Create persistent competency_trajectories table with RLS and indexes for GrowthLens Feature 2

CREATE TABLE IF NOT EXISTS public.competency_trajectories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    competency_id TEXT NOT NULL,
    competency_name TEXT NOT NULL,
    trend TEXT NOT NULL CHECK (trend IN ('improving', 'stagnating', 'declining', 'insufficient_evidence')),
    improving_probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stagnating_probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    declining_probability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    last_evidence_at TIMESTAMPTZ,
    first_evidence_at TIMESTAMPTZ,
    freshness_state TEXT NOT NULL DEFAULT 'fresh' CHECK (freshness_state IN ('fresh', 'recent', 'aging', 'stale')),
    days_since_last_evidence INTEGER NOT NULL DEFAULT 0,
    insufficient_evidence BOOLEAN NOT NULL DEFAULT FALSE,
    model_version TEXT NOT NULL DEFAULT 'feature2-lstm-v1',
    supporting_evidence_ids JSONB DEFAULT '[]'::jsonb,
    supporting_evidence_titles JSONB DEFAULT '[]'::jsonb,
    explanation TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_employee_competency_trajectory UNIQUE (employee_id, competency_id)
);

-- Indexes for high-performance trajectory retrieval
CREATE INDEX IF NOT EXISTS idx_trajectories_employee ON public.competency_trajectories(employee_id);
CREATE INDEX IF NOT EXISTS idx_trajectories_competency ON public.competency_trajectories(competency_id);
CREATE INDEX IF NOT EXISTS idx_trajectories_org ON public.competency_trajectories(organization_id);
CREATE INDEX IF NOT EXISTS idx_trajectories_trend ON public.competency_trajectories(trend);

-- Enable Row Level Security
ALTER TABLE public.competency_trajectories ENABLE ROW LEVEL SECURITY;

-- 1. Read policy: Employees can view their own trajectory
DROP POLICY IF EXISTS "Employees view own trajectory" ON public.competency_trajectories;
CREATE POLICY "Employees view own trajectory" ON public.competency_trajectories
    FOR SELECT USING (
        employee_id = auth.uid()::text
        OR employee_id IN (SELECT id::text FROM public.profiles WHERE user_id = auth.uid())
    );

-- 2. Read policy: Managers can view direct reports' trajectories
DROP POLICY IF EXISTS "Managers view direct reports trajectories" ON public.competency_trajectories;
CREATE POLICY "Managers view direct reports trajectories" ON public.competency_trajectories
    FOR SELECT USING (
        employee_id IN (
            SELECT p.user_id::text FROM public.profiles p
            JOIN public.manager_assignments ma ON ma.employee_id = p.id
            WHERE ma.manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
        OR employee_id IN (
            SELECT ma.employee_id::text FROM public.manager_assignments ma
            WHERE ma.manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

-- 3. Write policy: Service role / Backend can insert or update trajectories
DROP POLICY IF EXISTS "Service role manage trajectories" ON public.competency_trajectories;
CREATE POLICY "Service role manage trajectories" ON public.competency_trajectories
    FOR ALL USING (true) WITH CHECK (true);
