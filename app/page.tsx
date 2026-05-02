"use client";

import { useState } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ResumeBuilder } from "@/components/ResumeBuilder";
import { JobDashboard, Job } from "@/components/JobDashboard";

export default function Home() {
  const [view, setView] = useState<"onboarding" | "dashboard" | "builder">("onboarding");
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);

  const handleOnboardingComplete = (data: any) => {
    setOnboardingData(data);
    
    // If jobs are provided, go to dashboard, otherwise go to builder
    if (data.jobs && data.jobs.length > 0) {
      setSelectedJobs(data.jobs);
      setView("dashboard");
    } else {
      setView("builder");
    }
  };

  const handleBackToOnboarding = () => {
    setView("onboarding");
    setOnboardingData(null);
    setSelectedJobs([]);
  };

  const handleApplyComplete = (results: any[]) => {
    // After applying, could show results or go to builder
    setView("builder");
  };

  const handleBackToDashboard = () => {
    setView("dashboard");
  };

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
