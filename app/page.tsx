"use client";

import { useEffect, useState } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ResumeBuilder } from "@/components/ResumeBuilder";
import { JobDashboard, Job } from "@/components/JobDashboard";

const SESSION_STORAGE_KEY = "lazyme-session";
type AppView = "onboarding" | "dashboard" | "builder";

function saveSession(view: AppView, onboardingData: any, selectedJobs: Job[] = []) {
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ view, onboardingData, selectedJobs })
  );

  window.history.replaceState(null, "", view === "onboarding" ? "/" : `#${view}`);
}

export default function Home() {
  const [view, setView] = useState<AppView>("onboarding");
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        const savedView = session.view || "onboarding";
        const nextView = session.onboardingData ? savedView : "onboarding";

        setView(nextView);
        setOnboardingData(session.onboardingData || null);
        setSelectedJobs(session.selectedJobs || []);
      }
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ view, onboardingData, selectedJobs })
    );
  }, [hydrated, view, onboardingData, selectedJobs]);

  const handleOnboardingComplete = (data: any) => {
    setOnboardingData(data);
    
    // If jobs are provided, go to dashboard, otherwise go to builder
    if (data.jobs && data.jobs.length > 0) {
      const nextJobs = data.jobs;
      setSelectedJobs(nextJobs);
      setView("dashboard");
      saveSession("dashboard", data, nextJobs);
    } else {
      setView("builder");
      saveSession("builder", data);
    }
  };

  const handleBackToOnboarding = () => {
    setView("onboarding");
    setOnboardingData(null);
    setSelectedJobs([]);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.history.replaceState(null, "", "/");
  };

  const handleApplyComplete = (results: any[]) => {
    // After applying, could show results or go to builder
    setView("builder");
    saveSession("builder", onboardingData, selectedJobs);
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
    saveSession("dashboard", onboardingData, selectedJobs);
  };

  if (!hydrated) {
    return <main className="min-h-screen bg-[#0f172a]" />;
  }

  return (
    <main>
      {view === "onboarding" && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
      
      {view === "dashboard" && onboardingData && (
        <JobDashboard
          resume={onboardingData.parsedData}
          jobs={selectedJobs}
          userEmail={onboardingData.userEmail}
          userName={onboardingData.userName}
          onBack={handleBackToOnboarding}
          onApplyComplete={handleApplyComplete}
        />
      )}
      
      {view === "builder" && onboardingData && (
        <ResumeBuilder
          initialData={onboardingData.parsedData}
          jobDescription={onboardingData.jobDescription}
          companyName={onboardingData.companyName}
          jobTitle={onboardingData.jobTitle}
          companyEmail={onboardingData.companyEmail}
          generateCover={onboardingData.generateCover}
        />
      )}
    </main>
  );
}
