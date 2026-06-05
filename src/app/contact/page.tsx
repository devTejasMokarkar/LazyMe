"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Send, CheckCircle2, MessageSquare, Globe, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !message.trim()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const infoCards = [
    { icon: Mail, title: "Email", detail: "support@lazyme.ai", href: "mailto:support@lazyme.ai" },
    { icon: Globe, title: "Social", detail: "@LazyMeAI", href: "#" },
    { icon: Clock, title: "Response Time", detail: "Within 24 hours", href: null },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="fixed top-0 left-0 right-0 h-16 z-40 flex items-center px-6 glass-dark border-b">
        <Link href="/" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Back to Home</span>
        </Link>
      </header>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Contact Us</h1>
                <p className="text-sm text-on-surface-variant font-medium mt-1">We&apos;d love to hear from you</p>
              </div>
            </div>
            <div className="h-[2px] w-20 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </motion.div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {infoCards.map((card, i) => (
              <motion.div key={card.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                {card.href ? (
                  <a href={card.href} className="block glass rounded-2xl p-5 border border-outline-variant/30 hover:border-primary/30 hover:scale-[1.02] transition-all duration-300 group">
                    <card.icon className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{card.title}</p>
                    <p className="text-sm font-semibold text-primary">{card.detail}</p>
                  </a>
                ) : (
                  <div className="glass rounded-2xl p-5 border border-outline-variant/30">
                    <card.icon className="w-5 h-5 text-primary mb-3" />
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{card.title}</p>
                    <p className="text-sm font-semibold text-primary">{card.detail}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-3xl p-8 md:p-10 border border-outline-variant/30 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Send a Message</h2>
                  <p className="text-xs text-on-surface-variant font-medium">Fill out the form and we&apos;ll get back to you shortly.</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isSubmitted ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                    <p className="text-on-surface-variant font-medium text-sm max-w-sm mb-8">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
                    <button onClick={() => { setIsSubmitted(false); setFullName(""); setMessage(""); }} className="btn-secondary px-6 py-2 text-xs font-bold rounded-lg">
                      Send Another Message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="contact-fullname" className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Full Name</label>
                      <input id="contact-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required className="w-full px-4 py-3 rounded-xl bg-background border border-outline-variant text-primary text-sm font-medium placeholder:text-on-surface-variant/40 outline-none transition-all" />
                    </div>
                    <div>
                      <label htmlFor="contact-message" className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Message</label>
                      <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us how we can help..." required rows={5} className="w-full px-4 py-3 rounded-xl bg-background border border-outline-variant text-primary text-sm font-medium placeholder:text-on-surface-variant/40 outline-none resize-none transition-all" />
                    </div>
                    <button type="submit" disabled={isSubmitting || !fullName.trim() || !message.trim()} className="btn-primary w-full py-3.5 rounded-xl font-bold text-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? (
                        <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending...</span>
                      ) : (
                        <span className="flex items-center gap-2">Send Message <Send className="w-4 h-4" /></span>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="py-10 px-6 border-t border-outline-variant">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-medium text-on-surface-variant/60">© 2024 LazyMe AI. Automating the future of work.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
