-- Migration: 20260928_user_integrations.sql
-- Description: Create user_integrations table for encrypted GitHub & Jira credentials

CREATE TABLE IF NOT EXISTS public.user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('github', 'jira')),
    
    -- Encrypted Credentials (stored encrypted using AES-256 / Fernet)
    encrypted_credentials TEXT NOT NULL,
    
    -- Metadata for identification, display, and ingestion routing
    external_username TEXT,
    base_url TEXT,
    repository_owner TEXT,
    repository_name TEXT,
    project_key TEXT,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    connection_status TEXT NOT NULL DEFAULT 'untested' CHECK (connection_status IN ('untested', 'connected', 'invalid_credentials', 'error')),
    last_validated_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Indexes for fast lookup by user and provider
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON public.user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_user_integrations_profile ON public.user_integrations(profile_id);

-- Enable Row Level Security
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- 1. Read / Write Policy: Users can only manage their own credentials
DROP POLICY IF EXISTS "Users manage own integrations" ON public.user_integrations;
CREATE POLICY "Users manage own integrations" ON public.user_integrations
    FOR ALL USING (auth.uid() = user_id);

-- 2. Service role access for backend ingestion pipeline
DROP POLICY IF EXISTS "Service role full access on integrations" ON public.user_integrations;
CREATE POLICY "Service role full access on integrations" ON public.user_integrations
    FOR ALL TO service_role USING (true) WITH CHECK (true);
