"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-40 flex items-center px-6 glass-dark border-b">
        <Link
          href="/"
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Back to Home</span>
        </Link>
      </header>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
                <p className="text-sm text-on-surface-variant font-medium mt-1">Effective: January 1, 2024</p>
              </div>
            </div>
            <div className="h-[2px] w-20 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-12"
          >
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using LazyMe AI (&quot;the Service&quot;), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use the Service.
                We reserve the right to modify these terms at any time, and your continued use of
                the Service constitutes acceptance of any changes.
              </p>
            </Section>

            <Section title="2. Description of Service">
              <p>
                LazyMe AI provides an AI-powered career automation platform that includes resume
                building, job matching, application automation, and interview preparation tools.
                The Service is provided &quot;as is&quot; and we make no guarantees regarding job
                placement outcomes.
              </p>
            </Section>

            <Section title="3. User Accounts">
              <p>
                To use certain features, you must create an account using Google authentication.
                You are responsible for maintaining the security of your account and for all
                activities that occur under your account. You must notify us immediately of any
                unauthorized access.
              </p>
            </Section>

            <Section title="4. User Content & Data">
              <p>
                You retain ownership of all content you upload, including resumes, cover letters,
                and personal information. By using the Service, you grant us a limited license to
                process this content solely for the purpose of providing our services. We will
                never share your resume data with employers without your explicit consent.
              </p>
            </Section>

            <Section title="5. AI-Generated Content">
              <p>
                Our AI tools generate suggestions, optimizations, and content based on your input.
                While we strive for accuracy, AI-generated content may contain errors. You are
                responsible for reviewing and approving all content before submission. LazyMe AI
                is not liable for any consequences resulting from the use of AI-generated content.
              </p>
            </Section>

            <Section title="6. Credits & Payment">
              <p>
                Certain features require credits. Credits can be purchased through our supported
                payment methods (Stripe, PayPal, Razorpay). All purchases are final unless
                otherwise required by law. Unused credits do not expire. We reserve the right
                to modify pricing with 30 days notice.
              </p>
            </Section>

            <Section title="7. Prohibited Use">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-on-surface-variant">
                <li>Use the Service for any unlawful purpose</li>
                <li>Upload false or misleading information</li>
                <li>Attempt to reverse-engineer or exploit our AI models</li>
                <li>Automate access to the Service beyond intended use</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Resell or redistribute the Service without authorization</li>
              </ul>
            </Section>

            <Section title="8. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, LazyMe AI shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages, including
                loss of profits, data, or employment opportunities, arising out of your use
                of or inability to use the Service.
              </p>
            </Section>

            <Section title="9. Termination">
              <p>
                We may suspend or terminate your access to the Service at any time for violation
                of these terms or for any other reason at our discretion. Upon termination, your
                right to use the Service ceases immediately. You may request export of your data
                before account deletion.
              </p>
            </Section>

            <Section title="10. Governing Law">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the
                jurisdiction in which LazyMe AI operates, without regard to conflict of law
                principles. Any disputes shall be resolved through binding arbitration.
              </p>
            </Section>

            <Section title="11. Contact">
              <p>
                For questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:legal@lazyme.ai" className="text-primary hover:underline font-semibold">
                  legal@lazyme.ai
                </a>{" "}
                or visit our{" "}
                <Link href="/contact" className="text-primary hover:underline font-semibold">
                  Contact page
                </Link>.
              </p>
            </Section>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-outline-variant">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-medium text-on-surface-variant/60">
            © 2024 LazyMe AI. Automating the future of work.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight text-primary">{title}</h2>
      <div className="text-on-surface-variant leading-relaxed font-medium text-[15px] space-y-3">
        {children}
      </div>
    </div>
  );
}
