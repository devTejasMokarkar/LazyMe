"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
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
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-sm text-on-surface-variant font-medium mt-1">Last updated: January 1, 2024</p>
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
            <Section title="1. Information We Collect">
              <p>
                We collect information you provide directly to us, such as when you create an account,
                upload your resume, use our AI features, or contact us for support. This may include:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-on-surface-variant">
                <li>Name, email address, and profile information</li>
                <li>Resume content, work history, and skills data</li>
                <li>Job preferences and search criteria</li>
                <li>Usage data and interaction patterns with our AI tools</li>
                <li>Device information and browser type</li>
              </ul>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>
                We use the information we collect to provide, maintain, and improve our services,
                including:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-on-surface-variant">
                <li>Processing and optimizing your resume using AI</li>
                <li>Matching you with relevant job opportunities</li>
                <li>Providing personalized interview preparation</li>
                <li>Improving our AI models and service quality</li>
                <li>Communicating with you about updates and features</li>
              </ul>
            </Section>

            <Section title="3. Data Sharing & Third Parties">
              <p>
                We do not sell your personal information. We may share your data with trusted
                third-party service providers who assist us in operating our platform, such as
                cloud hosting providers, analytics services, and payment processors. All third
                parties are bound by strict data protection agreements.
              </p>
            </Section>

            <Section title="4. Data Security">
              <p>
                We implement industry-standard security measures to protect your personal
                information, including encryption in transit and at rest, regular security
                audits, and access controls. However, no method of transmission over the
                Internet is 100% secure.
              </p>
            </Section>

            <Section title="5. Your Rights">
              <p>
                You have the right to access, correct, or delete your personal data at any time.
                You can also request a copy of your data or opt out of certain processing activities.
                To exercise these rights, please contact us at{" "}
                <a href="mailto:privacy@lazyme.ai" className="text-primary hover:underline font-semibold">
                  privacy@lazyme.ai
                </a>.
              </p>
            </Section>

            <Section title="6. Cookies & Tracking">
              <p>
                We use cookies and similar tracking technologies to enhance your experience,
                analyze usage patterns, and deliver personalized content. You can manage your
                cookie preferences through your browser settings.
              </p>
            </Section>

            <Section title="7. Changes to This Policy">
              <p>
                We may update this privacy policy from time to time. We will notify you of any
                material changes by posting the new policy on this page and updating the
                &quot;Last updated&quot; date.
              </p>
            </Section>

            <Section title="8. Contact Us">
              <p>
                If you have any questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@lazyme.ai" className="text-primary hover:underline font-semibold">
                  privacy@lazyme.ai
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
            <Link href="/terms" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
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
