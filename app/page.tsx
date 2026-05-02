"use client";

import { useState } from "react";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ResumeBuilder } from "@/components/ResumeBuilder";

export default function Home() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  const handleOnboardingComplete = (data: any) => {
    setOnboardingData(data);
    setOnboardingComplete(true);
  };

  return (
    <main>
      {!onboardingComplete ? (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      ) : (
        <ResumeBuilder
          initialData={onboardingData?.parsedData}
          jobDescription={onboardingData?.jobDescription}
          companyName={onboardingData?.companyName}
          jobTitle={onboardingData?.jobTitle}
          companyEmail={onboardingData?.companyEmail}
          generateCover={onboardingData?.generateCover}
        />
      )}
    </main>
  );
}
