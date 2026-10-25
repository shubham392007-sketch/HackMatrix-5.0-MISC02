-- Migration: Recruiter Portal, Organizations, Memberships, Mode C Postings, and Targeted Candidate Share Invitations
-- Date: 2026-10-25

-- 1. Create employer_organizations table
CREATE TABLE IF NOT EXISTS employer_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255),
    website VARCHAR(512),
    location VARCHAR(255),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    logo_url VARCHAR(512),
    is_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employer_organizations_name ON employer_organizations(name);
CREATE INDEX IF NOT EXISTS idx_employer_organizations_slug ON employer_organizations(slug);

-- 2. Create organization_memberships table
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES employer_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'recruiter', -- 'recruiter', 'hiring_manager', 'org_admin'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'pending_approval', 'suspended'
    job_title VARCHAR(255),
    public_contact_name VARCHAR(255),
    public_contact_email VARCHAR(255),
    is_public_contact_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_org_user_membership UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_status ON organization_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON organization_memberships(organization_id);

-- 3. Add Recruiter Fields to job_postings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_postings' AND column_name = 'status') THEN
        ALTER TABLE job_postings ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'published';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_postings' AND column_name = 'organization_id') THEN
        ALTER TABLE job_postings ADD COLUMN organization_id UUID REFERENCES employer_organizations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_postings' AND column_name = 'recruiter_user_id') THEN
        ALTER TABLE job_postings ADD COLUMN recruiter_user_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_postings' AND column_name = 'public_recruiter_name') THEN
        ALTER TABLE job_postings ADD COLUMN public_recruiter_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_postings' AND column_name = 'public_recruiter_email') THEN
        ALTER TABLE job_postings ADD COLUMN public_recruiter_email VARCHAR(255);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_org_id ON job_postings(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_recruiter ON job_postings(recruiter_user_id);

-- 4. Create candidate_share_invitations table
CREATE TABLE IF NOT EXISTS candidate_share_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
    candidate_user_id UUID NOT NULL,
    recruiter_email VARCHAR(255) NOT NULL,
    recruiter_user_id UUID,
    organization_id UUID REFERENCES employer_organizations(id) ON DELETE SET NULL,
    job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
    candidate_message TEXT,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'delivered', -- 'delivered', 'pending_account'
    pipeline_status VARCHAR(50) NOT NULL DEFAULT 'new', -- 'new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'
    is_read_by_recruiter BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    recruiter_notes TEXT,
    last_status_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_invitations_recruiter ON candidate_share_invitations(recruiter_user_id, pipeline_status);
CREATE INDEX IF NOT EXISTS idx_share_invitations_email ON candidate_share_invitations(recruiter_email);
CREATE INDEX IF NOT EXISTS idx_share_invitations_candidate ON candidate_share_invitations(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_share_invitations_job ON candidate_share_invitations(job_id);

-- 5. Add optional sender_user_id and job_id to recruiter_messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_messages' AND column_name = 'sender_user_id') THEN
        ALTER TABLE recruiter_messages ADD COLUMN sender_user_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recruiter_messages' AND column_name = 'job_id') THEN
        ALTER TABLE recruiter_messages ADD COLUMN job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Configure Replica Identity and Realtime
ALTER TABLE candidate_share_invitations REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'candidate_share_invitations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE candidate_share_invitations;
    END IF;
END $$;

-- 7. Row Level Security Policies
ALTER TABLE employer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_share_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations: Read-only for authenticated or anon for active verified orgs
DROP POLICY IF EXISTS orgs_public_select ON employer_organizations;
CREATE POLICY orgs_public_select ON employer_organizations
    FOR SELECT TO public
    USING (is_verified = true);

-- Memberships: Members can view their own organization memberships
DROP POLICY IF EXISTS memberships_user_policy ON organization_memberships;
CREATE POLICY memberships_user_policy ON organization_memberships
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Candidate Share Invitations:
-- Candidates can view/insert invitations they created
DROP POLICY IF EXISTS share_invitations_candidate_policy ON candidate_share_invitations;
CREATE POLICY share_invitations_candidate_policy ON candidate_share_invitations
    FOR ALL TO authenticated
    USING (auth.uid() = candidate_user_id OR candidate_user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    WITH CHECK (auth.uid() = candidate_user_id OR candidate_user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Recruiters can view invitations directed to them or their email
DROP POLICY IF EXISTS share_invitations_recruiter_policy ON candidate_share_invitations;
CREATE POLICY share_invitations_recruiter_policy ON candidate_share_invitations
    FOR ALL TO authenticated
    USING (
        auth.uid() = recruiter_user_id 
        OR recruiter_user_id = '00000000-0000-0000-0000-000000000001'::uuid
        OR lower(recruiter_email) = lower(auth.jwt() ->> 'email')
    );
