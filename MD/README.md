# LazyMe AI

**Apply to jobs in minutes, not hours.**

LazyMe AI is an outcome-driven job application engine. Upload your resume, the system discovers matching roles, optimizes your resume for ATS, and applies on your behalf — end-to-end.

## Why LazyMe

LazyMe is not a resume builder. It exists to get you interviews, not to help you tweak margins.

**Optimized for:**
- Getting applications out fast
- Minimal user effort
- Higher ATS pass rates

**Not optimized for:**
- Manual resume editing
- Document formatting
- LaTeX flexibility

## Core Features

- **AI Job Discovery** — Ranks jobs by resume-to-description match.
- **Auto Resume Generation** — Tailors your resume per role.
- **ATS Optimization** — Weighted keyword scoring and automatic improvement when below threshold.
- **Auto-Pilot Apply** — Background discovery, scoring, and application pipeline.
- **Batch Apply** — Apply to multiple jobs in a single click.
- **Email Apply** — Sends personalized application emails with resume and cover letter.
- **Cover Letter Generation** — AI-written cover letters per job description.
- **Interview Prep** — Resume-driven Q&A cheat sheet for interview revision.
- **Kanban Board** — Track applications through stages.
- **Multi-Provider AI** — Pluggable backends (Gemini, OpenAI, OpenRouter, local Ollama) with a fallback chain.
- **BYO API Keys** — Use your own provider keys or platform-provided credits.
- **Credits & Payments** — Built-in credit packs via Stripe, PayPal, and Razorpay.

## User Flow

```
Upload Resume → Discover Jobs → Score & Match → Auto-Improve (if needed)
→ Generate Cover Letter → Apply (Email / Track) → Track on Board
```

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, Framer Motion, `geist` font
- **Auth:** NextAuth 5 (Auth.js) with Prisma adapter, Google OAuth
- **Database:** PostgreSQL via Prisma (Supabase-compatible)
- **AI:** Google Generative AI (Gemini), OpenAI, OpenRouter, Ollama
- **Payments:** Stripe, PayPal, Razorpay
- **Scraping:** axios + cheerio (LinkedIn, Indeed, Remotive)
- **Parsing:** pdf-parse, mammoth (DOCX), Tesseract-style OCR fallback
- **Email:** Nodemailer
- **Testing:** Vitest, Testing Library

## Project Structure

```
lazyme-ai/
├── prisma/                      # Prisma schema and migrations
├── public/                      # Static assets
├── scripts/                     # Local helper scripts (e.g. test-ollama)
├── deploy/                      # Docker, vercel, and compose configs
├── MD/                          # Extended docs (deployment, project plan)
│   ├── README.md
│   ├── DEPLOYMENT.md
│   └── ProjectPlan.md
├── graphify-out/                # Static code-analysis report (graph.json, manifest)
└── src/
    ├── app/                     # Next.js App Router
    │   ├── (app)/               # Authenticated app shell
    │   │   ├── dashboard/
    │   │   ├── jobs/
    │   │   ├── linkedin-jobs/
    │   │   ├── apply/
    │   │   ├── board/           # Kanban tracker
    │   │   ├── chat/            # Resume chat
    │   │   ├── resume/
    │   │   ├── interview-prep/
    │   │   ├── analytics/
    │   │   └── settings/
    │   ├── resume-builder/      # Public resume builder
    │   ├── api/                 # Route handlers (see API Endpoints)
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/              # React components
    │   ├── apply/ chat/ dashboard/ interview/ jobs/ kanban/
    │   ├── landing/ layout/ onboarding/ resume/ settings/ shared/ ui/
    ├── config/                  # Auth config (NextAuth providers, callbacks)
    ├── features/                # Domain services
    │   ├── ai/                  # AI service, prompts, ATS, job-matcher, auto-pilot
    │   ├── auth/                # Auth helpers
    │   ├── credits/             # Credit balance and packs
    │   ├── jobs/                # Job matching, scraping orchestration
    │   ├── payments/            # Stripe / PayPal / Razorpay integrations
    │   ├── pdf/                 # PDF rendering utilities
    │   └── resume/              # Resume processing
    ├── hooks/                   # Reusable React hooks
    ├── lib/                     # Cross-cutting libraries
    │   ├── db.ts                # Prisma client singleton
    │   ├── cache.ts             # In-memory cache wrapper
    │   ├── encryption.ts        # At-rest encryption for user API keys
    │   ├── logger.ts            # pino-based logger
    │   ├── debounce.ts
    │   ├── utils.ts
    │   └── parser/              # Resume/doc parsing (PDF, DOCX, OCR, chunking, validation)
    ├── providers/               # React context providers
    ├── scrapers/                # Job-board scrapers (LinkedIn, Indeed, Remotive)
    ├── types/                   # Shared TypeScript types
    ├── middleware.ts            # Next.js middleware (auth, routing)
    └── __tests__/               # Top-level test suites
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- PostgreSQL (local or hosted, e.g. Supabase)

### Installation

```bash
git clone <repository-url>
cd lazyme-ai
npm install
cp .env.example .env.local
```

Edit `.env.local` with the keys you want to use. See [`.env.example`](./.env.example) for the full list of supported variables. Required entries:

- `GEMINI_API_KEY` — primary AI provider
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — NextAuth
- `SMTP_*` — outgoing application emails

Optional: `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_*`, payment-gateway keys.

### Development

```bash
npm run dev          # Next.js dev server with Prisma generation
npm run lint         # ESLint
npm test             # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

### Production Build

```bash
npm run build
npm start
```

The application is served at `http://localhost:3000` by default.

## API Endpoints

Route handlers live under `src/app/api/`.

### Job Discovery & Application

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/discover-jobs` | Match resume skills against job requirements |
| POST | `/api/auto-apply` | Orchestrate Resume → ATS → Improve → Cover → Apply |
| POST | `/api/auto-pilot` | Background discovery + apply pipeline |
| POST | `/api/auto-pilot/apply` | Apply a single auto-pilot candidate |
| POST | `/api/jobs` | List / search jobs |
| GET | `/api/linkedin-jobs` | Fetch LinkedIn jobs |
| POST | `/api/search-jobs` | Search across configured sources |
| POST | `/api/scheduled-search` | Scheduled search runs |
| POST | `/api/applications` | Application tracking CRUD |

### Resume & ATS

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/parse-resume` | Extract structured data from PDF / DOCX / TXT |
| POST | `/api/generate-resume` | Generate a tailored resume |
| POST | `/api/generate-all` | Resume + Cover Letter + ATS score in one call |
| POST | `/api/generate-cover` | Cover letter only |
| POST | `/api/generate-dummy-resume` | Generate a sample resume for testing |
| POST | `/api/generate-resume-pdf` | Render resume to PDF |
| POST | `/api/create-resume-from-chat` | Build a resume from chat input |
| POST | `/api/enhance-resume-append` | Append enhancements to an existing resume |
| POST | `/api/improve-resume` | Improve resume for a job description |
| POST | `/api/optimize-resume` | Optimize resume structure / keywords |
| POST | `/api/analyze-ats` | Run ATS analysis |
| POST | `/api/analyze-ats-chunked` | Chunked ATS analysis for large resumes |
| POST | `/api/ats-score` | Compute weighted ATS score |
| GET / POST | `/api/resumes` | List / manage resumes |
| GET / POST / PATCH | `/api/user/resume` | Current user's active resume |

### Interview Prep & Chat

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/interview-prep` | Resume-driven Q&A generation |
| POST | `/api/ollama/enhance-prompt` | Local LLM prompt enhancement |
| POST | `/api/ollama/update-resume` | Local LLM resume update |

### User, Credits & API Keys

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET / POST | `/api/user/credits` | Credit balance and history |
| GET / POST / DELETE | `/api/user/api-keys` | User-provided provider API keys (encrypted at rest) |
| GET | `/api/auth/[...nextauth]` | NextAuth handler |
| POST | `/api/auth/[...nextauth]` | NextAuth callbacks |

### Email

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/send-email` | Send application email with resume and cover letter |

### Payments

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/payments/create` | Create a checkout session / order |
| POST | `/api/payments/verify` | Verify a completed payment |
| POST | `/api/payments/webhooks/stripe` | Stripe webhook |
| POST | `/api/payments/webhooks/paypal` | PayPal webhook |
| POST | `/api/payments/webhooks/razorpay` | Razorpay webhook |

### System

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/health` | Health check |

## Configuration

### AI Fallback Chain

Text generation goes through `generateText()`, which attempts providers in order:

1. **Ollama** (skipped on Vercel / serverless where unreachable)
2. **Gemini** (primary cloud provider)
3. **OpenRouter** (fallback when Gemini is rate-limited)
4. **OpenAI** (when user provides a key)

Users can attach their own provider keys via Settings; keys are encrypted at rest with `src/lib/encryption.ts`.

### Payments

The credit system supports three gateways. Configure only the ones you intend to use; unused sections can remain commented out in `.env.local`:

- **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **PayPal** — `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- **Razorpay** — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`

## Deployment

See [`MD/DEPLOYMENT.md`](./MD/DEPLOYMENT.md) for the full guide covering:

- Vercel deployment (primary, recommended)
- Docker / Docker Compose deployment
- Self-hosting

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT — see [`LICENSE`](./LICENSE) if present, otherwise the standard MIT terms apply.

## Support

Please open an issue in the repository for bug reports, feature requests, or questions.

---

**Stop writing resumes. Start getting interviews.**
add bulk and limit req