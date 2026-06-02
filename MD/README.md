# LazyMe AI

**Apply to jobs in 2 minutes using AI.**

LazyMe AI is an AI Job Application Engine that automatically discovers relevant jobs, optimizes your resume for ATS, and applies to multiple positions with a single click. Stop writing resumes. Start getting interviews.

## Core Features

- **AI Job Discovery**: Automatically finds and ranks jobs based on your resume skills and experience
- **Auto Resume Generation**: Upload your resume and let AI optimize it for each job
- **ATS Optimization**: Automatic keyword matching and resume improvement for higher ATS scores
- **Auto-Improvement Loop**: If ATS score < 70%, resume is automatically improved before applying
- **Batch Apply**: Apply to multiple jobs with one click
- **Email Apply**: Automatically send personalized emails with resume and cover letter
- **Cover Letter Generation**: AI-generated cover letters tailored to each job description
- **Single Pipeline**: One orchestrator handles Resume → ATS → Improve → Cover Letter → Apply

## User Flow

Upload Resume → Discover Jobs → Select Jobs → Click Apply → Done

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Google Generative AI (Gemini 2.0 Flash)
- **Icons**: Lucide React
- **PDF Processing**: pdf-parse
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lazyme-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Build
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
lazyme-ai/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── discover-jobs/ # Job discovery and matching
│   │   ├── auto-apply/    # Auto-apply orchestrator
│   │   ├── send-email/    # Email sending functionality
│   │   ├── generate-all/  # Resume + Cover + ATS generation
│   │   ├── parse-resume/  # Resume parsing from PDF/DOCX
│   │   └── improve-resume/ # ATS-based resume improvement
│   └── page.tsx           # Main application entry point
├── components/            # React components
│   ├── JobDashboard.tsx   # Job discovery and batch apply UI
│   ├── ResumeBuilder.tsx  # Resume editing and preview
│   ├── OnboardingFlow.tsx # User onboarding
│   └── ...
├── utils/                 # Utility functions
│   ├── gemini.ts          # Google AI integration
│   ├── ats.ts             # ATS scoring logic
│   └── promptBuilder.ts   # AI prompt building
└── graphify-out/          # Code analysis and documentation
```

## Usage

1. **Upload Resume**: Upload your existing resume (PDF, DOCX, TXT)
2. **Discover Jobs**: Paste job listings or let AI find matching jobs
3. **View Matches**: See jobs ranked by match percentage with your skills
4. **Select Jobs**: Choose which jobs to apply to
5. **Click Apply**: System automatically:
   - Optimizes your resume for each job (if ATS < 70%)
   - Generates personalized cover letters
   - Applies via email or tracks for easy apply

## API Endpoints

### POST /api/discover-jobs
Matches resume skills against job requirements and ranks by relevance.

### POST /api/auto-apply
Single orchestrator that processes jobs through: Resume → ATS → Improve → Cover Letter → Apply.

### POST /api/send-email
Sends application emails with resume and cover letter attachments.

### POST /api/parse-resume
Extracts structured resume data from PDF, DOCX, or TXT files using AI.

### POST /api/generate-all
Generates resume, cover letter, and ATS score in a single request.

### POST /api/improve-resume
Improves resume based on job description for better ATS matching.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.

## Product Philosophy

LazyMe AI is not a resume builder. It's an outcome-driven system focused on getting you interviews, not creating documents.

**We optimize for:**
- Getting you applied to jobs FAST
- Minimizing effort (lazy user mindset)
- Maximizing interview chances

**We don't optimize for:**
- Editing resumes
- Writing documents
- LaTeX flexibility

---

**Stop writing resumes. Start getting interviews.**



<!-- add new project connectors which is whatsapp campaign provider in -->



<!-- DEPLOY -->

TypeScript clean, all 166 tests pass. Here's everything that was changed:
Production Prep Complete
Changes Made
File	Change
utils/gemini.ts:10	Model: gemini-2.0-flash → gemini-2.5-flash (confirmed working on your key)
utils/gemini.ts:12-16	Made GEMINI_API_KEY check lazy — no longer throws at import, only when AI is actually called
utils/gemini.ts:285,330	Uses getModel() lazy initializer instead of module-level singleton
app/api/ollama/enhance-prompt/route.ts	Rewrote: calls generateText() instead of direct Ollama (uses full cloud fallback chain)
app/api/ollama/update-resume/route.ts	Rewrote: calls generateText() instead of direct Ollama (uses full cloud fallback chain)
.env.example	Created with all required/recommended/optional vars documented
AI Fallback Chain (production)
generateText() → 1. Ollama (skipped on Vercel, fails fast)
               → 2. Gemini 2.5 Flash ✅ (working free tier)
               → 3. OpenRouter free models (backup)
What to Set on Vercel
In your Vercel project dashboard → Settings → Environment Variables:
Variable	Source	Notes
GEMINI_API_KEY	Your existing key	Works with Gemini 2.5 Flash
OPENROUTER_API_KEY	Your existing key	Backup when Gemini is rate-limited
DATABASE_URL	Supabase	Your PostgreSQL connection string
AUTH_SECRET	Generate via openssl rand -base64 32	NextAuth signing key
AUTH_GOOGLE_ID	Google Cloud Console	OAuth 2.0 client ID
AUTH_GOOGLE_SECRET	Google Cloud Console	OAuth 2.0 client secret
SMTP_HOST/PORT/USER/PASS	Your email provider	For sending applications
NEXT_PUBLIC_APP_URL	https://your-app.vercel.app	Public URL
Do NOT set OLLAMA_BASE_URL or OLLAMA_MODEL — they default, fail silently, and the cloud chain handles everything.

 <!-- https://lazymeai.vercel.app -->


 next step add api key accept from user if he has also accept api keys like openrouter gemini openai so it becomes free is user doesnt have api key he can use free tier and afte rfree tier ask him to upgrade or user can pay for the api keys and use the app with his own api keys also add credits system for users who dont have api keys  so they can use the app with free credits and after free credits user has to buy credits to use the app  add stripe payment gateway integration for credits also add paypal payment gateway integration for credits and  also add razorpay payment gateway integration for credits  

 also add a route where user can get the personalized qna according the resume like quick revieion cheat sheet for interview prep and this should be run using olama or by own api keys 


 i want to add something likethe data which is extracted from resume we save to googles browser saved data and  when user gets redirected he can prefilled data easily










 //---
 Here's exactly how ATS systems score a resume, ranked by impact:Click any row to see exactly what ATS checks for in that section.

**The short answer ranked by impact:**

**#1 — Keywords in your experience bullets (25%)** — this is the biggest lever. ATS weights keywords found inside bullet points 2–3× more than the same keyword in a skills list. "Built RAG pipelines" in a bullet beats "RAG" in a skills row every time.

**#2 — Job title match (30%)** — many ATS systems hard-filter on this before anything else. Your title needs to mirror the job posting. "Software Developer" vs "Software Engineer" can cause an automatic reject.

**#3 — Skills section (15%)** — a clean, machine-readable label-value table (like what I built for you) is what ATS parses. No tables with merged cells, no icons, no columns.

**#4 — Summary (10%)** — ATS reads this early and indexes it heavily. Your 3–4 line summary should contain your title, years of experience, and your top 5 keywords naturally.

**#5 — File structure (8%)** — the silent killer. Two-column layouts, text in tables, headers/footers, and decorative fonts break parsers silently. The resume I built uses single-column, Helvetica, plain bullets — which is why it passes.

The bottom of the list (education, gaps, metrics) matters mostly for the human reviewer *after* ATS passes you — not for the ATS score itself.