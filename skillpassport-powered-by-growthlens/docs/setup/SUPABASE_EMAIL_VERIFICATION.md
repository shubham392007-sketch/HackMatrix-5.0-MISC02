# Supabase Auth, Email Verification & Onboarding Setup Guide — Skill Passport

This document provides the authoritative setup, configuration, and production verification procedures for Skill Passport's email-signup, custom confirmation email delivery, and onboarding workflow.

---

## 1. End-to-End User Experience Architecture

```text
┌─────────────────────────┐
│     1. Sign Up Page     │  User fills in Full Name, Email, Password, Role
│    (/signup)            │  Strict validation: non-empty, email regex, 6+ char pwd, matching confirmation
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  2. Supabase Auth API   │  supabase.auth.signUp() with emailRedirectTo:
│                         │  `${origin}/auth/callback?next=/app/onboarding`
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Check Your Email     │  Dedicated screen on /signup and /auth/verify-email?status=pending
│    Screen Shown         │  User sees submitted email, spam tip, and 60s cooldown resend action
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Branded Verification │  Supabase sends branded HTML email (supabase/templates/confirmation.html)
│    Email Dispatched     │  CTA button points to real {{ .ConfirmationURL }}
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. User Clicks Link     │  Opens {{ .ConfirmationURL }} produced by Supabase Auth
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 6. Auth Callback Route  │  Handles PKCE code or OTP token_hash via @supabase/ssr
│    (/auth/callback)     │  Validates safe internal redirect to prevent open redirects
│                         │  Authoritatively confirms user.email_confirmed_at
│                         │  Resolves persistent profile to check onboarding completion status
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 7. Verification Screen  │  Shows "Email Verified Successfully!" confirmation
│  (/auth/verify-email)   │  Auto-redirects within 2.5 seconds to next destination
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 8. Onboarding Wizard    │  /app/onboarding loads/initializes genuine profile
│   (Step 1: Calibration) │  Resumes saved step if in-progress; skips to passport if completed
└─────────────────────────┘
```

---

## 2. Supabase Dashboard Authentication Configuration

To ensure registration requests require confirmation and redirect back to Skill Passport, the following settings must be applied in the **Supabase Dashboard** (`https://supabase.com/dashboard/project/<project-id>`):

### 2.1 Enable Email Auth & Require Confirmation
1. In the Supabase Dashboard, navigate to **Authentication** &rarr; **Providers** &rarr; **Email**.
2. Ensure **Enable Email provider** is toggled **ON**.
3. Ensure **Confirm email** is toggled **ON** (`true`).
   > **Important:** If "Confirm email" is toggled OFF, Supabase will auto-confirm accounts immediately, which bypasses the verification email requirement. Keep this setting enabled.
4. Set **Secure email change** to **ON** (recommended).

### 2.2 Site URL & Redirect URLs (Callback Whitelist)
1. In the Supabase Dashboard, navigate to **Authentication** &rarr; **URL Configuration**.
2. Set **Site URL** to the primary application URL:
   - Local development: `http://localhost:3001` (or `http://localhost:3000`)
   - Production: `https://your-domain.com` (or your active Vercel deployment URL)
3. Under **Redirect URLs**, add all authorized callback destinations:
   ```text
   http://localhost:3001/auth/callback
   http://localhost:3001/auth/callback*
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback*
   https://*.vercel.app/auth/callback
   https://your-production-domain.com/auth/callback
   ```
   > **Security Note:** Never add wildcard `*` or allow arbitrary external domains. The application callback strictly validates relative destinations to prevent open redirect vulnerabilities.

### 2.3 Token Expiration Settings
1. In **Authentication** &rarr; **URL Configuration**, set the **Email OTP / Link Expiration** time:
   - Default: `86400` seconds (24 hours).
   - Recommended for high security: `3600` to `86400` seconds (1 to 24 hours).

---

## 3. Custom Email Template Installation

The repository maintains version-controlled, production-ready templates matching Skill Passport's warm cream, charcoal typography, and orange CTA styling:
- HTML Template: [`supabase/templates/confirmation.html`](../../supabase/templates/confirmation.html)
- Plain Text Template: [`supabase/templates/confirmation.txt`](../../supabase/templates/confirmation.txt)

### How to apply the template in Supabase:
1. Open the Supabase Dashboard &rarr; **Authentication** &rarr; **Email Templates**.
2. Select the **Confirm signup** tab.
3. Set the **Subject** line to:
   ```text
   Verify your Skill Passport email address
   ```
4. Copy the complete contents of [`supabase/templates/confirmation.html`](../../supabase/templates/confirmation.html) and paste it into the **Message Body (HTML)** editor.
5. Click **Save**.

### Supported Template Variables:
| Variable | Description |
| :--- | :--- |
| `{{ .ConfirmationURL }}` | The cryptographically generated confirmation link containing the token and redirect URL. Used on the primary CTA button and plain-text fallback. |
| `{{ .Email }}` | The recipient's email address. |
| `{{ .SiteURL }}` | The configured application Site URL. |
| `{{ .Token }}` | The 6-digit confirmation code (if using numerical OTP verification). |

---

## 4. Production Email Delivery (Custom SMTP Configuration)

> [!WARNING]
> **Supabase Default Email Limits:** The built-in Supabase email service is strictly intended for initial development and evaluation. It is rate-limited to **30 emails per hour** and sends from `noreply@mail.app.supabase.io`, which email providers frequently mark as spam.
> For production or user-facing deployments, configure a dedicated custom SMTP provider.

### 4.1 Recommended SMTP Providers
- **Resend** (Recommended for Next.js applications)
- **SendGrid**
- **Amazon SES**
- **Postmark**

### 4.2 Configuring Custom SMTP in Supabase
1. In the Supabase Dashboard, navigate to **Project Settings** &rarr; **Authentication** &rarr; **SMTP Settings**.
2. Toggle **Enable Custom SMTP** to **ON**.
3. Fill in provider credentials:
   - **Sender email**: `noreply@yourdomain.com` (Must match your verified DNS domain)
   - **Sender name**: `Skill Passport`
   - **Host**: e.g., `smtp.resend.com` or `smtp.sendgrid.net`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **User**: SMTP username provided by your provider (e.g., `resend` or `apikey`)
   - **Password**: SMTP API key / secret password
4. Click **Save**.

### 4.3 Domain DNS Checklist (SPF, DKIM, DMARC)
Ensure your domain registrar / DNS provider (Cloudflare, Route53, Namecheap) has verified records:
- [ ] **SPF Record:** `v=spf1 include:<provider-spf-domain> ~all`
- [ ] **DKIM Records:** 2 to 3 CNAME records generated by your SMTP provider.
- [ ] **DMARC Record:** `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com;`
- [ ] **MX Records:** Configured if receiving inbound bounces.

---

## 5. Environment Variables Reference

The Next.js frontend uses the following environment variables (defined in `.env.local`):

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project REST URL | `https://igsiwwztcxliwbuylshn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Publishable / Anon Key | `sb_publishable_...` |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | FastAPI Backend URL | `http://127.0.0.1:8001` |
| `NEXT_PUBLIC_API_URL` | Yes | API v1 Prefix | `http://127.0.0.1:8001/api/v1` |

> [!CAUTION]
> **Secret Hygiene:** Never expose `SUPABASE_SERVICE_ROLE_KEY` or SMTP passwords in `NEXT_PUBLIC_*` variables or client-side bundles. Service role keys belong exclusively on the secure backend.

---

## 6. Implementation Checklist & Status

| Component | Status | Location | Notes |
| :--- | :---: | :--- | :--- |
| Registration Form & Field Validation | **Ready** | [`src/app/signup/page.tsx`](../../src/app/signup/page.tsx) | Enforces name, email format, 6+ char password, confirmation match, and 60s resend cooldown. |
| Supabase Auth Client Integration | **Ready** | [`src/context/AuthContext.tsx`](../../src/context/AuthContext.tsx) | Passes `emailRedirectTo`, checks `email_confirmed_at`, prevents premature auto-login. |
| Dedicated Email Verification Views | **Ready** | [`src/app/auth/verify-email/page.tsx`](../../src/app/auth/verify-email/page.tsx) | Handles Pending, Success, Expired, Invalid, and Already-Verified states. |
| Branded Email Template (HTML) | **Ready** | [`supabase/templates/confirmation.html`](../../supabase/templates/confirmation.html) | Warm cream, orange CTA, table-based, mobile responsive. |
| Plain Text Template | **Ready** | [`supabase/templates/confirmation.txt`](../../supabase/templates/confirmation.txt) | Plain-text fallback for text-only clients. |
| Server Callback Handler | **Ready** | [`src/app/auth/callback/route.ts`](../../src/app/auth/callback/route.ts) | PKCE code exchange, OTP token verification, open-redirect prevention, profile resolution. |
| Route Guard & Verification Gate | **Ready** | [`src/middleware.ts`](../../src/middleware.ts) & [`AppAuthGuard.tsx`](../../src/components/app/AppAuthGuard.tsx) | Blocks unverified and unauthenticated users from `/app/*` and `/app/onboarding`. |
| Onboarding Wizard Gating | **Ready** | [`src/app/app/onboarding/page.tsx`](../../src/app/app/onboarding/page.tsx) | Checks verification before loading state; resumes step or redirects if already completed. |
| Hosted Supabase Settings | **External** | Supabase Dashboard | Requires manual verification of "Confirm email: ON", Site URL, and Redirect URLs. |
| Custom SMTP Delivery | **External** | SMTP Provider | Requires configuring custom SMTP credentials for high-volume delivery. |
