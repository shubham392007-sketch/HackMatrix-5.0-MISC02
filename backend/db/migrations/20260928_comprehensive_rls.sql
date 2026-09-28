-- GrowthLens Production Supabase Authentication & RLS Security Migration
-- 1. Ensure profiles.id equals user_id so (auth.uid() = id) works directly
DO $$
BEGIN
  -- Update existing profiles where id != user_id
  UPDATE public.profiles SET id = user_id WHERE id != user_id;
  
  -- Update default column for id to default to user_id or gen_random_uuid
  ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
END $$;

-- 2. Link existing employees to auth.users if email matches
UPDATE public.employees e
SET user_id = u.id
FROM auth.users u
WHERE LOWER(e.email) = LOWER(u.email) AND (e.user_id IS NULL OR e.user_id != u.id);

-- 3. Update handle_new_user trigger to always set id = new.id AND user_id = new.id
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

  INSERT INTO public.profiles (id, user_id, full_name, email, role, organization_id, onboarding_completed)
  VALUES (
    new.id,
    new.id,
    user_name,
    new.email,
    user_role,
    default_org_id,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      user_id = EXCLUDED.user_id,
      updated_at = timezone('utc'::text, now());

  -- Also link or create corresponding employee record
  UPDATE public.employees SET user_id = new.id WHERE LOWER(email) = LOWER(new.email);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Profiles Policies (auth.uid() = id) - NON-RECURSIVE
DROP POLICY IF EXISTS "Users can view their own data" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can read direct reports profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;

CREATE POLICY "Users can view their own data" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- Manager direct reports without self-referential subquery on profiles
CREATE POLICY "Managers can read direct reports profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT employee_id FROM public.manager_assignments
      WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on profiles" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. User Integrations Policies (GitHub/Jira tokens)
DROP POLICY IF EXISTS "Users manage own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can view own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Service role full access on integrations" ON public.user_integrations;

CREATE POLICY "Users can view own integrations" ON public.user_integrations
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can insert own integrations" ON public.user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can update own integrations" ON public.user_integrations
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = profile_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Users can delete own integrations" ON public.user_integrations
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = profile_id);

CREATE POLICY "Service role full access on integrations" ON public.user_integrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Evidence Policies
DROP POLICY IF EXISTS "Users can view own evidence" ON public.evidence;
DROP POLICY IF EXISTS "Managers can view team evidence" ON public.evidence;
DROP POLICY IF EXISTS "Service role full access on evidence" ON public.evidence;

CREATE POLICY "Users can view own evidence" ON public.evidence
  FOR SELECT USING (
    employee_id = auth.uid()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers can view team evidence" ON public.evidence
  FOR SELECT USING (
    employee_id IN (
      SELECT employee_id FROM public.manager_assignments
      WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on evidence" ON public.evidence
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Recommendations Policies
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Managers can view team recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Service role full access on recommendations" ON public.recommendations;

CREATE POLICY "Users can view own recommendations" ON public.recommendations
  FOR SELECT USING (
    employee_id = auth.uid()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers can view team recommendations" ON public.recommendations
  FOR SELECT USING (
    employee_id IN (
      SELECT employee_id FROM public.manager_assignments
      WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on recommendations" ON public.recommendations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. Competency Trajectories Policies
DROP POLICY IF EXISTS "Employees view own trajectory" ON public.competency_trajectories;
DROP POLICY IF EXISTS "Managers view direct reports trajectories" ON public.competency_trajectories;
DROP POLICY IF EXISTS "Service role manage trajectories" ON public.competency_trajectories;

CREATE POLICY "Employees view own trajectory" ON public.competency_trajectories
  FOR SELECT USING (
    employee_id = auth.uid()::text
    OR employee_id IN (SELECT id::text FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Managers view direct reports trajectories" ON public.competency_trajectories
  FOR SELECT USING (
    employee_id IN (
      SELECT employee_id::text FROM public.manager_assignments
      WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Service role manage trajectories" ON public.competency_trajectories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. Employees table Policies
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;
DROP POLICY IF EXISTS "Service role full access on employees" ON public.employees;

CREATE POLICY "Users can view own employee record" ON public.employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR id = auth.uid()
    OR email IN (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Service role full access on employees" ON public.employees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. Manager Assignments (Strictly non-recursive)
DROP POLICY IF EXISTS "View manager assignments" ON public.manager_assignments;
DROP POLICY IF EXISTS "Service role full access on manager_assignments" ON public.manager_assignments;

CREATE POLICY "View manager assignments" ON public.manager_assignments
  FOR SELECT USING (
    manager_id = auth.uid() OR employee_id = auth.uid()
  );

CREATE POLICY "Service role full access on manager_assignments" ON public.manager_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12. Organizations
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Service role full access on organizations" ON public.organizations;

CREATE POLICY "Users can view own organization" ON public.organizations
  FOR SELECT USING (true);

CREATE POLICY "Service role full access on organizations" ON public.organizations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

