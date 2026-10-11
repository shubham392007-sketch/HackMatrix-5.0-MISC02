# SkillPassport Powered by GrowthLens

A standalone public website and authentication UI for **SkillPassport Powered by GrowthLens**, built as a natural extension of the GrowthLens talent intelligence ecosystem.

## 🚀 Independent Vercel Deployment Instructions

This project is fully self-contained and designed for zero-config Vercel deployment:

1. **Import the repository** into Vercel.
2. Under **Project Settings** → **General**:
   - Set **Root Directory** to: `skillpassport-powered-by-growthlens`
3. Under **Build & Development Settings**:
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`
4. Deploy!

The deployed root domain (`/`) will immediately render the SkillPassport homepage.

## 📂 Public Routes

- `/` — Homepage: Hero with verified artifact graph, problem statement, 4 core capabilities, and methodology.
- `/features` — In-depth breakdown of the 4 engines: Evidence Intelligence, Verified Skill Profile, Role Matching, and Personalized Learning.
- `/about` — Manifesto, comparison with legacy resumes, and foundational product principles.
- `/developers` — Architecture flow, engineering principles, and contributor roster.
- `/login` — Sign-in interface matching GrowthLens visual design (frontend validation demo).
- `/signup` — Registration interface with role selection (Employee / Reviewer).

## 🎨 Design System

Follows the canonical GrowthLens **Moonwood Neobrutalist** palette:
- **Lime**: `#DFE968`
- **Cream**: `#FBF1CF`
- **Blush**: `#F6C8D6`
- **Peach**: `#F3A878`
- **CTA**: `#F6BB84`
- **Ink**: `#1C1C1C`
- **Card**: `#FBF6DF`
- **Fonts**: Poppins & Yellowtail script accent
