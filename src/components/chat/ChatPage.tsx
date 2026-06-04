"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Send, Sparkles, Loader2, FileText, X, CheckCircle2,
  ArrowRight, MessageSquare, User, Bot, RefreshCw, Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResumeData, ChatMessage } from '@/features/ai/resume-chat.service';
import { formatResumePreview } from '@/features/ai/resume-chat.service';

const suggestedMessages = [
  "I'm a full-stack developer with 3 years of experience in React and Node.js, looking for senior roles",
  "I'm a data scientist specializing in ML and NLP, proficient in Python and TensorFlow",
  "I'm a product manager with 5 years experience in B2B SaaS, skilled in Agile and stakeholder management",
  "I'm a recent CS grad with internship experience at Google, skilled in Java and cloud computing",
];

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  const hasTriggeredInitial = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI resume builder. Tell me about yourself — your skills, experience, education, and what role you're targeting — and I'll create a professional resume for you. You can also type something simple like \"I'm a React developer with 3 years experience\" and I'll expand it.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async (customText?: string) => {
    const text = (customText !== undefined ? customText : input).trim();
    if (!text || isGenerating) return;
    if (customText === undefined) {
      setInput('');
    }
    setError(null);
    addMessage('user', text);

    setIsGenerating(true);
    try {
      const res = await fetch('/api/create-resume-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (res.ok && data.resume) {
        setGeneratedResume(data.resume);
        // Auto-sync to localStorage so /resume picks it up even if the user
        // navigates away without clicking "Save & Edit".
        try {
          localStorage.setItem('lazyme_pending_resume', JSON.stringify(data.resume));
          window.dispatchEvent(new Event('pendingResumeReady'));
        } catch { /* quota / serialization — non-fatal */ }
        const preview = formatResumePreview(data.resume);
        addMessage('assistant', `I've created a resume based on your information. Here's a preview:\n\n${preview}\n\nYou can ask me to refine any section, or click "Save & Edit" below to open it in the Resume Builder.`);
      } else {
        addMessage('assistant', `Sorry, I couldn't generate your resume. ${data.error || 'Please try again with more details.'}`);
      }
    } catch (e: any) {
      addMessage('assistant', 'Sorry, something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedResume) return;
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');
    setError(null);
    addMessage('user', text);

    setIsGenerating(true);
    try {
      const refinePrompt = `I previously described myself and got this resume:\n${JSON.stringify(generatedResume, null, 2)}\n\nNow I want to refine it. Here are my changes: ${text}\n\nReturn the COMPLETE updated resume JSON with the changes applied. Keep all existing fields that I didn't mention changing. Output ONLY valid JSON.`;
      const res = await fetch('/api/create-resume-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: refinePrompt }),
      });
      const data = await res.json();

      if (res.ok && data.resume) {
        setGeneratedResume(data.resume);
        // Auto-sync to localStorage so /resume stays in sync after each refine.
        try {
          localStorage.setItem('lazyme_pending_resume', JSON.stringify(data.resume));
          window.dispatchEvent(new Event('pendingResumeReady'));
        } catch { /* non-fatal */ }
        const preview = formatResumePreview(data.resume);
        addMessage('assistant', `I've updated your resume with your changes:\n\n${preview}\n\nAnything else you'd like to adjust?`);
      } else {
        addMessage('assistant', `Sorry, I couldn't update your resume. ${data.error || 'Please try again.'}`);
      }
    } catch {
      addMessage('assistant', 'Sorry, something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndRedirect = () => {
    if (!generatedResume) return;
    localStorage.setItem('lazyme_pending_resume', JSON.stringify(generatedResume));
    window.dispatchEvent(new Event('pendingResumeReady'));
    router.push('/resume');
  };

  // Loads a server-generated John Doe demo resume (ATS 60-70 baseline).
  // The actual prompt lives in /api/generate-dummy-resume — we just trigger it.
  const handleLoadDemo = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    addMessage('user', 'Load demo resume (John Doe, Java Developer)');
    try {
      const res = await fetch('/api/generate-dummy-resume', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.resume) {
        setGeneratedResume(data.resume);
        // Auto-sync to localStorage so /resume shows the demo even if the user
        // navigates away without clicking "Save & Edit".
        try {
          localStorage.setItem('lazyme_pending_resume', JSON.stringify(data.resume));
          window.dispatchEvent(new Event('pendingResumeReady'));
        } catch { /* non-fatal */ }
        const preview = formatResumePreview(data.resume);
        addMessage(
          'assistant',
          `Here's a demo John Doe resume (ATS baseline ~60-70). ` +
          `Click "Save & Edit" to open it in the Resume Builder, or paste a JD on the resume page to run the ATS scorer.\n\n${preview}`
        );
      } else {
        addMessage('assistant', `Sorry, I couldn't load the demo resume. ${data.error || 'Please try again.'}`);
      }
    } catch {
      addMessage('assistant', 'Sorry, something went wrong while loading the demo resume.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generatedResume ? handleRefine() : handleSend();
    }
  };

  const handleSuggestedClick = (msg: string) => {
    setInput(msg);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-outline-variant/30 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">AI Resume Builder</h2>
              <p className="text-[10px] text-on-surface-variant font-medium">Create your resume from scratch</p>
            </div>
          </div>
          {generatedResume && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all lg:hidden"
            >
              <FileText className="w-3.5 h-3.5" />
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3 max-w-3xl mx-auto",
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1",
                  msg.role === 'user'
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-surface-container-highest border border-outline-variant'
                )}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-primary" />
                  ) : (
                    <Bot className="w-4 h-4 text-secondary" />
                  )}
                </div>
                <div className={cn(
                  "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-tr-md'
                    : 'bg-surface-container border border-outline-variant/50 rounded-tl-md'
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-3xl mx-auto"
            >
              <div className="w-8 h-8 rounded-xl bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-secondary" />
              </div>
              <div className="bg-surface-container border border-outline-variant/50 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating your resume...
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto px-4 py-2 bg-error/10 border border-error/30 rounded-xl text-error text-xs font-medium flex items-center gap-2"
            >
              <X className="w-3 h-3 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Suggested messages (only show at start) */}
          {messages.length === 1 && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="max-w-3xl mx-auto pt-4"
            >
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Try saying:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedMessages.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => handleSuggestedClick(msg)}
                    className="text-left text-[11px] px-3 py-2 bg-surface-container-hover border border-outline-variant/50 rounded-xl text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all max-w-[280px]"
                  >
                    "{msg}"
                  </button>
                ))}
                <button
                  onClick={handleLoadDemo}
                  disabled={isGenerating}
                  className="text-left text-[11px] px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary hover:bg-primary/20 transition-all font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate a John Doe demo resume (ATS 60-70 baseline)"
                >
                  <Sparkles className="w-3 h-3" />
                  Load Demo Resume
                </button>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Save bar (when resume generated) */}
        {generatedResume && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 sm:px-6 py-3 border-t border-outline-variant/30 bg-surface-container/50 backdrop-blur-sm"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <CheckCircle2 className="w-4 h-4 text-tertiary" />
                <span className="font-medium">Resume ready</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setGeneratedResume(null);
                    setMessages((prev) => prev.slice(0, 1));
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-higher transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  Start Over
                </button>
                <button
                  onClick={handleSaveAndRedirect}
                  className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3 h-3" />
                  Save & Edit
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Input */}
        <div className="border-t border-outline-variant/30 px-4 sm:px-6 py-3 sm:py-4 bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex items-end gap-2 sm:gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="flex-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-sm text-primary placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary resize-none max-h-32 leading-relaxed"
              placeholder={generatedResume ? "Ask me to refine a section..." : "Describe your background..."}
            />
            <button
              onClick={() => generatedResume ? handleRefine() : handleSend()}
              disabled={!input.trim() || isGenerating}
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
                input.trim() && !isGenerating
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:brightness-110'
                  : 'bg-surface-container-higher text-on-surface-variant/30 cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[9px] text-on-surface-variant/40 text-center mt-2 max-w-3xl mx-auto">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Resume Preview Panel (desktop) */}
      {generatedResume && (
        <aside className={cn(
          "hidden lg:flex w-[400px] xl:w-[480px] border-l border-outline-variant/30 flex-col h-full bg-surface-container-lowest/30",
          showPreview && "flex lg:hidden"
        )}>
          <div className="sticky top-0 border-b border-outline-variant/30 px-5 py-3 bg-surface-container-lowest/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Resume Preview</span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary transition-colors lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <div className="bg-white rounded-2xl shadow-lg p-6 text-black text-sm space-y-4">
              {/* Header */}
              <div className="text-center border-b border-gray-200 pb-4">
                <h2 className="text-xl font-bold">{generatedResume.name || 'Your Name'}</h2>
                <p className="text-gray-600 text-sm font-medium mt-1">{generatedResume.title || 'Your Title'}</p>
                {(generatedResume.email || generatedResume.phone || generatedResume.location) && (
                  <p className="text-gray-500 text-[11px] mt-1">
                    {[generatedResume.email, generatedResume.phone, generatedResume.location].filter(Boolean).join(' | ')}
                  </p>
                )}
              </div>

              {/* Summary */}
              {generatedResume.summary && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Summary</h3>
                  <p className="text-gray-700 text-xs leading-relaxed">{generatedResume.summary}</p>
                </div>
              )}

              {/* Skills */}
              {generatedResume.skills?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedResume.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-700 font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {generatedResume.experience?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Experience</h3>
                  {generatedResume.experience.map((exp, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold">{exp.role}</p>
                          <p className="text-xs text-gray-600">{exp.company}</p>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">{exp.duration}</span>
                      </div>
                      {exp.bullets?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {exp.bullets.map((b, j) => (
                            <li key={j} className="text-xs text-gray-700 ml-4 list-disc">{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {generatedResume.education?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Education</h3>
                  {generatedResume.education.map((edu, i) => (
                    <div key={i} className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold">{edu.school}</p>
                        <p className="text-xs text-gray-600">{edu.degree}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0 ml-2">{edu.year}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {generatedResume.projects && generatedResume.projects.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Projects</h3>
                  {generatedResume.projects.map((proj, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm font-semibold">{proj.name}</p>
                      <p className="text-xs text-gray-700">{proj.description}</p>
                      {proj.tech?.length > 0 && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Tech: {proj.tech.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
