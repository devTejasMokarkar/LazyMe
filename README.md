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
OPENROUTER_API_KEY=your_openrouter_api_key_here
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
