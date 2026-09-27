-- GrowthLens Production Supabase Authentication, Authorization & RLS Migration
-- Creates organizations, profiles, manager_assignments, triggers, and security policies

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default organization for initial user bootstrapping
INSERT INTO public.organizations (name, slug)
VALUES ('GrowthLens Core Workspace', 'growthlens-default')
ON CONFLICT (slug) DO NOTHING;

-- 2. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'MANAGER', 'ADMIN')),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    job_title TEXT,
    department TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Manager to Employee assignments (explicit relationship model)
CREATE TABLE IF NOT EXISTS public.manager_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_manager_employee UNIQUE (manager_id, employee_id)
);

-- 4. Extend existing tables with organization scoping if missing
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.ingestion_runs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 5. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_mgr ON public.manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_emp ON public.manager_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_org ON public.manager_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_org_id ON public.evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_emp_id ON public.evidence(employee_id);

-- 6. Trigger to create user profile upon Supabase Auth registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_org_id UUID;
  user_role TEXT;
  user_name TEXT;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'growthlens-default' LIMIT 1;
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'EMPLOYEE');
  IF user_role NOT IN ('EMPLOYEE', 'MANAGER', 'ADMIN') THEN
    user_role := 'EMPLOYEE';
  END IF;
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (user_id, full_name, email, role, organization_id, onboarding_completed)
  VALUES (
    new.id,
    user_name,
    new.email,
    user_role,
    default_org_id,
    FALSE
  )
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = timezone('utc'::text, now());

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Row Level Security Activation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers can read direct reports profiles" ON public.profiles;
CREATE POLICY "Managers can read direct reports profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT employee_id FROM public.manager_assignments
      WHERE manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Organizations policies
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
CREATE POLICY "Users can view own organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Manager assignments policies
DROP POLICY IF EXISTS "View manager assignments" ON public.manager_assignments;
CREATE POLICY "View manager assignments" ON public.manager_assignments
  FOR SELECT USING (
    manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR employee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
