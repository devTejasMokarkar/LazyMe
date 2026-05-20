SUGGEST.md — LazyMe AI: Brutal Reality Check & Build Plan

Last updated: May 2026 | Status: Pre-architecture phase


🔴 BRUTAL HONESTY FIRST
Before we plan anything, here's what's actually hard vs. what sounds hard:
What will ACTUALLY kill this project:

Job portal APIs don't want you. LinkedIn, Indeed, Wellfound — they actively block scrapers and deny API access to startups. You will not get official API keys from LinkedIn for job data easily. Wellfound has a limited partner API. Plan for scraping with Puppeteer/Playwright behind rotating proxies. This is technically and legally grey. Budget for this failing.
"Auto-apply" is mostly impossible at scale. LinkedIn Easy Apply, Greenhouse, Lever, Workday — each has its own DOM. You'd need individual adapters for each ATS. This is weeks of engineering per portal, not days.
A PDF editor in-browser is 6–8 weeks of work minimum. PDF.js can render. Fabric.js or Konva.js can overlay editable layers. But syncing edits back to a valid, ATS-parseable PDF is non-trivial. Be realistic: offer a "PDF-like visual editor" backed by structured JSON that exports to PDF — not a true inline PDF editor.
Google + LinkedIn SSO — Google OAuth is 2 days. LinkedIn OAuth is 4–6 days because their API review is slow and they require a business purpose. Start Google-only, add LinkedIn in Phase 2.
ATS score is not a real science. Every "ATS score" tool on the market is a keyword density checker pretending to be more. Be honest with users: "keyword match %" — don't call it an ATS score.

What's actually achievable and valuable:

Resume → structured JSON → AI-optimized per job → PDF export ✅
Job discovery via scraping (Wellfound, RemoteOK, LinkedIn public data) ✅
Cover letter generation ✅
Tracking which jobs you applied to ✅
"One-click apply" via email (for job posts that accept email) ✅
A beautiful, fast UI that makes the whole thing feel effortless ✅


🎨 COLOR SYSTEM (from "Snowy Yet Warm" palette)
--crimson:     #B23850   ← Primary CTA, active states
--sky:         #3B8BEB   ← Secondary, links, info
--cream:       #E7E3D4   ← Light mode backgrounds, cards
--ice-blue:    #C4DBF6   ← Light mode surfaces, hover states  
--slate:       #8590AA   ← Muted text, borders
--dark-base:   #0F1117   ← Dark mode primary background
--dark-surface:#181C26   ← Dark mode card background
--dark-border: #252A38   ← Dark mode borders
--white:       #FFFFFF
--text-dark:   #1A1D27
--text-muted:  #6B7280
Design direction: Minimal but warm. Dark default. The crimson-sky-cream trio should feel cold + alive simultaneously — like a job interview you're actually excited for.

🏗️ ARCHITECTURE DECISION (do this before touching code)
lazyme-ai/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Auth group — login, callback
│   │   ├── login/page.tsx
│   │   └── callback/page.tsx
│   ├── (app)/                    # Protected app group
│   │   ├── dashboard/page.tsx    # Job discovery + tracking
│   │   ├── resume/page.tsx       # Visual resume editor
│   │   └── applications/page.tsx # Application tracking
│   └── api/
│       ├── auth/                 # NextAuth routes
│       ├── jobs/                 # Job discovery, scraping
│       ├── resume/               # Parse, optimize, export
│       ├── apply/                # Auto-apply orchestrator
│       └── ai/                   # AI generation endpoints
├── components/
│   ├── ui/                       # Primitives (Button, Input, Badge)
│   ├── resume/                   # Resume editor components
│   ├── jobs/                     # Job card, job list, filters
│   └── layout/                   # Nav, sidebar, theme toggle
├── lib/
│   ├── ai/                       # Gemini client + prompts
│   ├── scraper/                  # Job scraping adapters
│   ├── pdf/                      # PDF parse + generate
│   ├── auth/                     # NextAuth config
│   └── db/                       # Prisma / Supabase client
├── types/                        # Shared TypeScript types
├── hooks/                        # React hooks
└── middleware.ts                  # Auth protection
Database: Supabase (free tier works, has Row Level Security built-in, OAuth-friendly)
Auth: NextAuth.js v5 (App Router compatible) — Google provider first
Job scraping: Playwright (headless) on a separate worker/queue — NOT in API routes
Queue: Inngest or BullMQ for background jobs
PDF: pdf-lib for generation, pdf-parse for reading

📋 FEATURE TIERS
Base (Free) User

Upload resume (PDF/DOCX)
See 10 matching jobs per day (scraped from Wellfound, RemoteOK, LinkedIn public)
AI keyword match % (not "ATS score" — honest labeling)
AI cover letter generation (3/day)
Manual apply tracking (paste URL + mark status)
Visual resume editor (JSON-backed, PDF export)

Pro User ($9–15/month)

Unlimited job discovery
Auto-apply via email (for email-apply jobs)
ATS optimization loop (auto-improve resume before applying)
Bulk cover letter generation
Application status tracking with email parsing
Multiple resume versions
Priority job match scoring


🚀 BUILD PHASES (chunked prompts — execute one at a time)

PHASE 1: Foundation (Week 1)
Do this first, no shortcuts.
Prompt 1A — Project setup + auth
You are a senior Next.js engineer setting up a production-grade SaaS app called LazyMe AI.

Stack:
- Next.js 14 with App Router
- TypeScript strict mode
- Tailwind CSS (with CSS variables for theming)
- NextAuth.js v5 for Google OAuth
- Supabase for database
- Prisma as ORM

Tasks:
1. Initialize the project with the folder structure in ARCHITECTURE.md
2. Set up NextAuth v5 with Google provider only (LinkedIn is Phase 2)
3. Create Prisma schema for: User, Resume, Job, Application, Plan tables
4. Set up Supabase connection with environment variables
5. Create middleware.ts that protects all /app/* routes
6. Create a minimal auth callback flow that:
   - Creates user in DB on first login
   - Assigns "base" plan by default
   - Redirects to /dashboard

Do NOT build any UI yet. Backend only.
Follow CODING_RULES.md strictly.
Prompt 1B — Theme + design system
You are a senior frontend engineer implementing the design system for LazyMe AI.

Color system (implement as CSS variables in globals.css):
- Dark mode (default): dark-base #0F1117, dark-surface #181C26, dark-border #252A38
- Light mode (toggle): cream #E7E3D4, ice-blue #C4DBF6, white #FFFFFF
- Accent: crimson #B23850, sky #3B8BEB, slate #8590AA
- Text: white on dark, #1A1D27 on light

Tasks:
1. Set up CSS variables for both themes in globals.css
2. Create a ThemeProvider component with system-default dark, toggle to light
3. Build these UI primitives only (no pages yet):
   - Button (primary/secondary/ghost variants, size sm/md/lg)
   - Badge (base/pro/status variants)
   - Input, TextArea
   - Card with CardHeader, CardContent, CardFooter
   - Separator, Skeleton
4. Build the main Layout: top nav with logo, theme toggle, user avatar + plan badge
5. Build a responsive sidebar for app navigation

Typography: Use 'Geist' (Next.js default) for UI, 'Geist Mono' for code/stats.
No lorem ipsum. No placeholder images. Real component structure only.

PHASE 2: Resume System (Week 2)
Prompt 2A — Resume parser + data model
Working on LazyMe AI resume system. Foundation is in place.

Task: Build the resume parsing pipeline.

1. POST /api/resume/parse
   - Accept PDF, DOCX, TXT
   - Use pdf-parse for PDF, mammoth for DOCX
   - Send extracted text to Gemini with this prompt structure:
     [see prompts/resume-parse.txt for the exact prompt]
   - Return structured ResumeData type (defined in types/resume.ts)
   - Store raw text + structured JSON in DB

2. Define ResumeData type:
   {
     personalInfo: { name, email, phone, location, linkedin, github, website }
     summary: string
     experience: Array<{ company, title, startDate, endDate, bullets: string[] }>
     education: Array<{ institution, degree, field, graduationDate, gpa? }>
     skills: Array<{ category, items: string[] }>
     projects?: Array<{ name, description, tech: string[], url? }>
     certifications?: Array<{ name, issuer, date }>
   }

3. Store the resume with version tracking (users can have multiple versions)

Use streaming for the Gemini response. Add proper error handling.
No mock data. If parsing fails, return a structured error.
Prompt 2B — Visual resume editor
Working on LazyMe AI. Resume parser is done.

Task: Build the visual resume editor (NOT a form editor, NOT a PDF editor).

Design concept: A split-screen view.
- Left panel: structured JSON editor displayed as WYSIWYG sections
- Right panel: Real-time PDF preview using react-pdf

Requirements:
1. The editor renders resume sections as styled blocks that feel like editing a document:
   - Click on any text → it becomes an inline input
   - No forms, no modal dialogs — direct inline editing
   - Drag to reorder experience entries and skill categories
   - Add/remove bullet points with Tab/Enter like a real editor
   
2. PDF preview (right panel):
   - Use @react-pdf/renderer to render a clean, ATS-friendly PDF template
   - Live preview updates as user edits (debounced 500ms)
   - "Download PDF" button
   - Template selector (2 templates: Minimal, Classic)

3. AI enhancement buttons per section:
   - "✦ Improve bullets" → sends to Gemini, streams improved versions
   - "✦ Quantify impact" → adds numbers/metrics to vague bullets
   - User can accept/reject each AI suggestion inline

4. Autosave to DB every 30 seconds or on blur

This is the core differentiator. Make it feel like Notion + resume editor.
No generic form fields. No label: [input] patterns.

PHASE 3: Job Discovery (Week 3)
Prompt 3A — Job scraping engine
Working on LazyMe AI. Resume system is complete.

Task: Build the job discovery scraping engine.

IMPORTANT constraints:
- Scraping runs as background jobs (Inngest), NOT in API routes
- Respect robots.txt and rate limits
- Add proper delays between requests (2-5s random)
- This is for personal use / demo — acknowledge legal grey area in code comments

Sources to scrape:
1. Wellfound (Angel.co) — /jobs page, filter by role keywords
   - Parser: extract title, company, salary_range, location, remote, description, apply_url
2. RemoteOK — has a public JSON API (https://remoteok.com/api) ← use this first, it's free and legal
3. LinkedIn public job search — scrape carefully, no login required for first 10 results

Job schema:
{
  id, source, title, company, location, remote, salary_min, salary_max,
  description, apply_url, apply_type (email|link|portal), posted_at,
  scraped_at, match_score?
}

Build:
1. Inngest function: discoverJobs(userId, keywords, location?)
2. Job deduplication by (source + title + company)
3. POST /api/jobs/discover — triggers the Inngest job, returns job_run_id
4. GET /api/jobs — returns paginated jobs for user with filters
5. Base plan: limit to 10 jobs/day. Pro: unlimited.

No mock data. If scraping fails gracefully, log it and return partial results.
Prompt 3B — Job matching + UI
Working on LazyMe AI. Job scraping is in place.

Task: Build job matching and the job discovery UI.

1. Matching algorithm (run server-side, not AI — fast and free):
   - Extract skills from user's resume (already in DB as structured JSON)
   - Compare against job description keywords
   - Score: (matched_skills / total_required_skills) * 100
   - Bonus points for: title match, location match, salary range match
   - Store match_score on the job record

2. Job Dashboard UI (this is the main screen):
   - Left sidebar: filters (remote, salary, date posted, match %)
   - Main area: job cards in a feed layout
   - Each job card shows:
     - Company logo (from Clearbit logo API: https://logo.clearbit.com/{domain})
     - Title, company, location, salary (if available)
     - Match percentage badge (color-coded: green >70%, yellow 40-70%, red <40%)
     - Tags: Remote, Visa, Posted X days ago
     - Quick action buttons: "View", "Save", "Apply"
   - Clicking a job opens a slide-over panel (not a new page) with full description
   
3. Plan enforcement:
   - Base users see 10 jobs, rest are blurred with "Upgrade to Pro" overlay
   - Use Suspense + skeleton loading for the feed

Design: Use the crimson/sky/slate color system. Dark default.
No mock data in the feed. Show empty state with CTA if no jobs yet.

PHASE 4: Apply Pipeline (Week 4)
Prompt 4A — Auto-apply orchestrator
Working on LazyMe AI. Job discovery is complete.

Task: Build the auto-apply pipeline.

This is the most complex part. Handle it carefully.

The pipeline per job:
1. GET resume for user → get structured JSON
2. GET job description
3. AI: optimize resume for this job (keyword matching, reorder skills)
   - Only if match_score < 70%
   - Stream the optimization, save new resume version
4. AI: generate cover letter tailored to job + company
5. Apply:
   a. If apply_type === "email": send via Nodemailer with PDF resume + cover letter
   b. If apply_type === "link": record as "manual" — return apply_url to user
   c. If apply_type === "portal": record as "manual" — Playwright support is Phase 2

Build:
1. Inngest function: autoApply(userId, jobId[]) — handles batch
2. POST /api/apply/batch — triggers for selected jobs
3. Rate limit: base = 0 auto-apply (manual only), pro = 20/day
4. Application record: { userId, jobId, status, resumeVersionId, coverLetter, appliedAt }
5. Real-time progress: use Server-Sent Events to stream apply status to UI
   - "Optimizing resume for Stripe..."
   - "Generating cover letter..."
   - "Sending application..."

The cover letter prompt should be in prompts/cover-letter.txt
Do not hardcode prompts in API routes.
Prompt 4B — Application tracker
Working on LazyMe AI. Apply pipeline is complete.

Task: Build the application tracker (your "source of truth" dashboard).

Think: a Kanban board for your job applications.

Columns: Applied → Screening → Interview → Offer → Rejected

Features:
1. Drag-and-drop between columns (use @dnd-kit/core — lightweight)
2. Each card shows: company, title, applied date, salary, next action
3. Click card → slide-over with:
   - Full application details
   - The cover letter that was sent
   - Resume version used (with link to view)
   - Notes field (editable)
   - Log timeline (Applied → Replied → Interview scheduled)
4. Stats header:
   - Total applied, response rate %, interviews scheduled, offers
5. Filter by: date range, status, company, source

For Pro users: add a simple "Email check" feature
- Parse forwarded emails to auto-update status (basic regex matching for "We received your application", "We'd like to schedule", etc.)
- This is not full email OAuth — just a forwarding address that you parse

No mock data. Empty state with animated illustration when no applications yet.

PHASE 5: Polish + Production (Week 5)
Prompt 5A — Landing page + onboarding
Working on LazyMe AI. Core features are complete.

Task: Build the landing page and onboarding flow.

Landing page (/) — shown to logged-out users:
- Hero: "Apply to jobs in 2 minutes." — NOT a wall of text
- Sub: "LazyMe discovers jobs that match your resume and applies for you."
- Primary CTA: "Get started free" → Google OAuth
- Social proof section: "Join X job seekers"
- How it works: 3 steps only (Upload → Discover → Apply)
- Pricing: Base (free) vs Pro ($12/mo) — simple 2-column table
- No footer spam. Just: GitHub, Twitter, Privacy, Terms

Color: This page should use the full Snowy Yet Warm palette.
Dark default. Minimal animation — one CSS fade-in on hero text.
Font: Keep Geist but use a larger, bolder display weight for the hero.

Onboarding (first login):
1. Step 1: Upload your resume (or paste LinkedIn URL — parse their public profile)
2. Step 2: Tell us your target role + location + remote preference
3. Step 3: Let AI analyze your resume → show keyword strengths
4. → Redirect to dashboard with first batch of jobs already queued

3 steps max. No forms longer than 5 fields per step. Progress indicator at top.
Prompt 5B — Performance + production hardening
Working on LazyMe AI. All features built. This is the final hardening pass.

Tasks:
1. Error boundaries on every major component
2. Rate limiting: implement with Upstash Redis on all API routes
   - /api/jobs/discover: 5 req/hour base, 50 req/hour pro
   - /api/apply: 5 req/day base (0 auto-apply), 20 req/day pro
   - /api/ai/*: 10 req/hour base, 100 req/hour pro
3. Loading states: every async operation has a proper skeleton/spinner
4. Error toasts: use sonner for consistent error messaging
5. Add Sentry for error tracking (DSN from env variable)
6. Implement proper CSP headers in next.config.ts
7. Verify all database queries use parameterized inputs (Prisma handles this, double-check raw queries)
8. Review all API routes: ensure auth check on every protected route
9. Add robots.txt (block /api/*, /dashboard/*)
10. Set up Vercel deployment with proper env variable groups (preview vs production)

Performance:
- Image optimization for company logos (next/image with external patterns)
- Lazy load the resume PDF preview (heavy component)
- Bundle analyzer run — ensure no unnecessary large packages

Do not add any new features in this pass. Hardening only.

🚫 WHAT NOT TO BUILD (save for later)

❌ Mobile app (focus on web first)
❌ Browser extension for auto-fill (complex, unreliable)
❌ Playwright auto-apply to portal ATS (Workday, Greenhouse) — too brittle
❌ LinkedIn job data via official API (requires partnership)
❌ Resume builder with LaTeX export (wrong focus)
❌ AI interview prep (different product)
❌ Salary negotiation tools (scope creep)


🔑 ENVIRONMENT VARIABLES NEEDED
env# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=
DIRECT_URL=

# AI
GEMINI_API_KEY=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Monitoring
SENTRY_DSN=

# Misc
CLEARBIT_API_KEY=  # optional, for company logos
NEXT_PUBLIC_APP_URL=

📐 THE ONE DESIGN RULE
The app should feel like something an engineer built for themselves — not a startup trying to look like a startup. Minimal. Purposeful. Every element earns its space. If you can remove it, remove it.
Dark mode is the identity. The crimson accent (#B23850) should appear sparingly — CTAs, active states, critical badges. The sky blue (#3B8BEB) for links and informational elements. Everything else is slate and dark surfaces.

✅ EXECUTION ORDER
Phase 1A → 1B → 2A → 2B → 3A → 3B → 4A → 4B → 5A → 5B
Each prompt builds on the previous. Do not skip phases.
Test each phase with real data before moving to the next.
If a phase fails, debug it before continuing — technical debt compounds.

"Stop writing resumes. Start getting interviews."