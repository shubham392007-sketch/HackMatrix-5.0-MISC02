# GrowthLens Supabase Authentication & Role-Based Access Control (RBAC) Architecture

## 1. System Architecture Overview

GrowthLens implements an enterprise-grade authentication, authorization, and multi-tenant organization structure powered by **Supabase Auth**, **PostgreSQL Row Level Security (RLS)**, **FastAPI JWT Dependencies**, and **Next.js App Router Client Context**.

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Frontend                     │
│  - AuthProvider (supabase.auth session & user profile) │
│  - ProtectedRoute guards (Role enforcement)           │
│  - Bearer Token injection in lib/api.ts                │
└──────────────────────────┬─────────────────────────────┘
                           │ Authorization: Bearer <JWT>
                           ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│  - get_current_user (Supabase JWT verification)        │
│  - get_current_profile (Profiles + Workspace Metadata) │
│  - require_employee / require_manager / require_admin  │
│  - check_employee_access (Cross-employee isolation)    │
└──────────────────────────┬─────────────────────────────┘
                           │ Service-Role Client Queries
                           ▼
┌────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL                   │
│  - auth.users (Credentials, sessions, MFA, emails)     │
│  - public.profiles (Linked via foreign key & trigger)  │
│  - public.organizations (Multi-tenant workspaces)      │
│  - public.manager_assignments (Direct report graphs)   │
│  - Row Level Security (RLS) on all talent tables       │
└────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Tables

### 2.1 `public.organizations`
Manages organizational and workspace tenancy:
- `id` (UUID, Primary Key)
- `name` (TEXT, Not Null)
- `slug` (TEXT, Unique, Not Null) — Default seed: `growthlens-default`
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.2 `public.profiles`
Authoritative user profile linked 1:1 with `auth.users`:
- `id` (UUID, Primary Key)
- `user_id` (UUID, References `auth.users(id)` ON DELETE CASCADE, Unique, Not Null)
- `full_name` (TEXT, Not Null)
- `email` (TEXT, Not Null)
- `avatar_url` (TEXT)
- `role` (TEXT, CHECK `role IN ('EMPLOYEE', 'MANAGER', 'ADMIN')`, Default `'EMPLOYEE'`)
- `organization_id` (UUID, References `public.organizations(id)`)
- `job_title` (TEXT)
- `department` (TEXT)
- `github_username` (TEXT)
- `jira_account_id` (TEXT)
- `onboarding_completed` (BOOLEAN, Default `FALSE`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.3 `public.manager_assignments`
Explicit manager-to-employee relationship graph:
- `id` (UUID, Primary Key)
- `manager_id` (UUID, References `public.profiles(id)` ON DELETE CASCADE)
- `employee_id` (UUID, References `public.profiles(id)` ON DELETE CASCADE)
- `organization_id` (UUID, References `public.organizations(id)` ON DELETE CASCADE)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Unique Constraint on `(manager_id, employee_id)`

---

## 3. Database Triggers & Row Level Security (RLS)

### 3.1 Automated Profile Creation (`handle_new_user`)
When a user registers or is created via Supabase Auth (`auth.users`), PostgreSQL trigger `on_auth_user_created` fires `public.handle_new_user()`:
1. Resolves `default_org_id` from `growthlens-default`.
2. Extracts `role` and `full_name` from `raw_user_meta_data`.
3. Inserts a corresponding row into `public.profiles`.

### 3.2 RLS Policies
All public tables have RLS enabled:
- **`public.profiles`**:
  - `Users can read own profile`: `auth.uid() = user_id`
  - `Managers can read direct reports profiles`: Subquery matching `public.manager_assignments`.
  - `Users can update own profile`: `auth.uid() = user_id`
- **`public.organizations`**: Read access for members of that organization.
- **`public.manager_assignments`**: Managers can view assignments where they are the manager.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint / Feature | Unauthenticated | EMPLOYEE | MANAGER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| `GET /api/profile/me` | ❌ 401 | ✅ Own Profile | ✅ Own Profile | ✅ Own Profile |
| `PATCH /api/profile/me` | ❌ 401 | ✅ Own Profile | ✅ Own Profile | ✅ Own Profile |
| `GET /api/profile/team` | ❌ 401 | ❌ 403 Forbidden | ✅ Direct Reports | ✅ Full Org |
| `POST /api/profile/assign` | ❌ 401 | ❌ 403 Forbidden | ✅ Assign Report | ✅ Assign Report |
| `/employee/dashboard` | Redirect to /login | ✅ Accessible | ✅ Accessible | ✅ Accessible |
| `/employee/evidence` | Redirect to /login | ✅ Accessible | ✅ Accessible | ✅ Accessible |
| `/employee/skills` | Redirect to /login | ✅ Accessible | ✅ Accessible | ✅ Accessible |
| `/employee/simulator` | Redirect to /login | ✅ Accessible | ✅ Accessible | ✅ Accessible |
| `/employee/narrative` | Redirect to /login | ✅ Accessible | ✅ Accessible | ✅ Accessible |
| `/manager/dashboard` | Redirect to /login | ❌ Unauthorized | ✅ Accessible | ✅ Accessible |
| `/manager/heatmap` | Redirect to /login | ❌ Unauthorized | ✅ Accessible | ✅ Accessible |

---

## 5. FastAPI Security Dependencies

Located in `backend/core/dependencies.py`:
- `get_current_user`: Extracts Bearer token, validates against Supabase Auth (`client.auth.get_user(token)`) with cryptographic fallback.
- `get_current_profile`: Loads profile from `public.profiles` (or `employees` legacy fallback), attaching role and workspace metadata.
- `require_employee`: Enforces `role IN ('EMPLOYEE', 'MANAGER', 'ADMIN')`.
- `require_manager`: Enforces `role IN ('MANAGER', 'ADMIN')` with HTTP 403.
- `require_admin`: Enforces `role == 'ADMIN'` with HTTP 403.
- `check_employee_access(profile, target_id)`: Prevents horizontal privilege escalation by verifying that employees cannot view another employee's private skill retention models or evidence.

---

## 6. Frontend Next.js Authentication

- **`AuthContext.tsx`**: Exposes `useAuth()` hook providing `{ user, session, profile, role, login, signup, logout, refreshProfile }`.
- **`ProtectedRoute.tsx`**: Wraps protected route views; handles authentication redirect to `/login?redirect=...` and role mismatch screens.
- **`lib/api.ts`**: Automatically attaches `Authorization: Bearer <session.access_token>` to every request dispatched to the backend.
- **`GlobalHeader.tsx`**: Displays current user status, role badge (`EMPLOYEE` / `MANAGER`), contextual navigation links, and logout trigger.

---

## 7. Verification & Automated Test Suite

A complete automated test suite is implemented in [`backend/tests/test_supabase_auth.py`](file:///d:/HackMatrix-MISC02/backend/tests/test_supabase_auth.py):
- `test_unauthenticated_request_rejected`: HTTP 401 on missing auth.
- `test_malformed_token_rejected`: HTTP 401 on invalid JWT.
- `test_role_enum_definitions`: Verifies UserRole enum values.
- `test_employee_profile_workflow`: Tests real user registration, login, profile fetch, and profile update.
- `test_employee_forbidden_from_manager_endpoints`: Verifies HTTP 403 on role breach.
- `test_manager_access_to_team_endpoints`: Verifies manager team discovery.
- `test_cross_employee_access_enforcement`: Tests strict isolation between employees.

**Test Run Result**:
```bash
pytest backend/tests/test_supabase_auth.py -v
# 7 passed, 0 failed in 10.44s
```
