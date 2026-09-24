-- GrowthLens Evidence Pipeline - Initial Schema
-- Migration: 001_initial_schema.sql
-- Date: 2026-09-24

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(255),
    department VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);

-- ============================================================
-- 2. competencies
-- ============================================================
CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_competencies_name ON competencies(name);

-- ============================================================
-- 3. skills
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    competency_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_competency ON skills(competency_id);

-- ============================================================
-- 4. employee_competencies
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    current_level VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, competency_id)
);

CREATE INDEX idx_emp_comp_employee ON employee_competencies(employee_id);
CREATE INDEX idx_emp_comp_competency ON employee_competencies(competency_id);

-- ============================================================
-- 5. integration_identities
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    external_user_id VARCHAR(255),
    external_username VARCHAR(255),
    external_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, external_username),
    UNIQUE(provider, external_email)
);

CREATE INDEX idx_identity_employee ON integration_identities(employee_id);
CREATE INDEX idx_identity_provider ON integration_identities(provider);
CREATE INDEX idx_identity_username ON integration_identities(provider, external_username);
CREATE INDEX idx_identity_ext_email ON integration_identities(provider, external_email);

-- ============================================================
-- 6. integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    owner_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    configuration_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integrations_provider ON integrations(provider);

-- ============================================================
-- 7. evidence
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    source VARCHAR(50) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    source_reference VARCHAR(512) NOT NULL,
    project_id VARCHAR(255),
    project_name VARCHAR(255),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    evidence_type VARCHAR(100),
    evidence_strength REAL,
    metadata JSONB DEFAULT '{}',
    is_mapped BOOLEAN NOT NULL DEFAULT TRUE,
    unmapped_external_identity VARCHAR(255),
    ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
    ai_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Deduplication: unique per source + source_reference
    UNIQUE(source, source_reference)
);

CREATE INDEX idx_evidence_employee ON evidence(employee_id);
CREATE INDEX idx_evidence_source ON evidence(source);
CREATE INDEX idx_evidence_source_type ON evidence(source_type);
CREATE INDEX idx_evidence_occurred ON evidence(occurred_at);
CREATE INDEX idx_evidence_mapped ON evidence(is_mapped);
CREATE INDEX idx_evidence_ai_processed ON evidence(ai_processed);
CREATE INDEX idx_evidence_employee_source ON evidence(employee_id, source);
CREATE INDEX idx_evidence_employee_occurred ON evidence(employee_id, occurred_at);

-- ============================================================
-- 8. evidence_skills
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    extraction_confidence REAL NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(evidence_id, skill_id)
);

CREATE INDEX idx_ev_skills_evidence ON evidence_skills(evidence_id);
CREATE INDEX idx_ev_skills_skill ON evidence_skills(skill_id);

-- ============================================================
-- 9. evidence_competencies
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    extraction_confidence REAL NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(evidence_id, competency_id)
);

CREATE INDEX idx_ev_comp_evidence ON evidence_competencies(evidence_id);
CREATE INDEX idx_ev_comp_competency ON evidence_competencies(competency_id);

-- ============================================================
-- 10. ingestion_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_found INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_summary TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_ingestion_source ON ingestion_runs(source);
CREATE INDEX idx_ingestion_status ON ingestion_runs(status);
CREATE INDEX idx_ingestion_started ON ingestion_runs(started_at);

-- ============================================================
-- 11. unmapped_skill_candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS unmapped_skill_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    extraction_confidence REAL DEFAULT 0.0,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unmapped_resolved ON unmapped_skill_candidates(resolved);

-- ============================================================
-- 12. recommendations (for RAG output)
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    competency_id UUID REFERENCES competencies(id) ON DELETE SET NULL,
    competency_name VARCHAR(255),
    action TEXT,
    justification TEXT,
    confidence REAL DEFAULT 0.0,
    evidence_sufficiency VARCHAR(50) NOT NULL DEFAULT 'insufficient',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rec_employee ON recommendations(employee_id);
CREATE INDEX idx_rec_competency ON recommendations(competency_id);

-- ============================================================
-- 13. recommendation_evidence
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendation_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(recommendation_id, evidence_id)
);

CREATE INDEX idx_rec_ev_rec ON recommendation_evidence(recommendation_id);
CREATE INDEX idx_rec_ev_evidence ON recommendation_evidence(evidence_id);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competencies_updated_at BEFORE UPDATE ON competencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_competencies_updated_at BEFORE UPDATE ON employee_competencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_identities_updated_at BEFORE UPDATE ON integration_identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
