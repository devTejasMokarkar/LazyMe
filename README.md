# LazyMe AI

An intelligent resume and cover letter generation platform powered by AI. Build professional resumes and generate personalized cover letters instantly.

## Features

- **AI-Powered Resume Generation**: Create professional resumes using Google's Gemini AI
- **Cover Letter Generation**: Generate personalized cover letters tailored to specific job descriptions
- **Live Preview**: See real-time updates as you build your resume
- **Multiple Export Formats**: Download resumes in various formats including LaTeX
- **Dark/Light Theme**: Toggle between themes for comfortable usage

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **AI Integration**: Google Generative AI (Gemini)
- **Icons**: Lucide React
- **PDF Processing**: pdf-parse

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
cp .env.local.example .env.local
```

4. Add your Google AI API key to `.env.local`:
```
GOOGLE_AI_API_KEY=your_api_key_here
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
├── components/            # React components
│   ├── ResumeBuilder.tsx  # Main resume builder component
│   ├── LivePreview.tsx    # Live preview component
│   └── EmailButton.tsx    # Email functionality
├── utils/                 # Utility functions
│   ├── promptBuilder.ts   # AI prompt building logic
│   ├── gemini.ts          # Google AI integration
│   └── latexFormatter.ts  # LaTeX formatting utilities
├── api/                   # API routes
│   ├── generate-resume/   # Resume generation endpoint
│   └── generate-cover/    # Cover letter generation endpoint
└── graphify-out/          # Code analysis and documentation
```

## Usage

1. **Build Your Resume**: Fill in your personal information, work experience, education, and skills
2. **Add Job Description**: Paste the job description you're applying for
3. **Generate AI Content**: Use AI to generate professional summaries and bullet points
4. **Generate Cover Letter**: Create a personalized cover letter
5. **Export**: Download your resume in your preferred format

## API Endpoints

### POST /api/generate-resume
Generates AI-enhanced resume content based on user input.

### POST /api/generate-cover
Generates a personalized cover letter based on resume and job description.

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

---

**Built with ❤️ using Next.js and Google AI**
