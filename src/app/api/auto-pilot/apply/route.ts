import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { generateText } from "@/features/ai/ai.service";
import { buildCoverLetterPrompt } from "@/features/ai/prompts/resume.prompts";
import { calculateWeightedATS } from "@/features/ai/ats.service";
import { logger } from "@/lib/logger";

interface ApplyTarget {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  salary?: string;
}

interface AutoPilotApplyRequest {
  jobs: ApplyTarget[];
  userEmail?: string;
  userName?: string;
  sendEmails?: boolean;
  generateCoverLetter?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AutoPilotApplyRequest = await req.json();
    const { jobs, userEmail, userName, sendEmails = false, generateCoverLetter = true } = body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "No jobs provided" }, { status: 400 });
    }

    const resumes = await prisma.userResume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    const primaryResume = resumes.find((r) => r.isDefault) || resumes[0];
    if (!primaryResume) {
      return NextResponse.json({ error: "No resume found. Upload a resume first." }, { status: 404 });
    }

    const resumeContent = typeof primaryResume.content === "string"
      ? JSON.parse(primaryResume.content)
      : primaryResume.content;

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
    });

    const email = userEmail || userProfile?.email || "";
    const name = userName || userProfile?.name || resumeContent.name || "";

    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        const jobDescription = `We are hiring a ${job.title} at ${job.company}. Location: ${job.location}. Apply here: ${job.url}`;

        const atsResult = calculateWeightedATS(resumeContent, jobDescription);

        let coverLetter: string | undefined;
        if (generateCoverLetter) {
          try {
            coverLetter = await generateText(
              buildCoverLetterPrompt(resumeContent, jobDescription, job.company)
            );
          } catch (e: any) {
            logger.warn({ error: e.message, job: job.id }, "Cover letter generation failed");
          }
        }

        const dbJob = await prisma.job.upsert({
          where: { id: job.id },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: jobDescription,
            source: job.source || "auto-pilot",
            applyUrl: job.url,
            matchScore: atsResult.score,
          },
          create: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: jobDescription,
            source: job.source || "auto-pilot",
            applyUrl: job.url,
            matchScore: atsResult.score,
          },
        });

        const application = await prisma.application.create({
          data: {
            userId,
            jobId: dbJob.id,
            resumeId: primaryResume.id,
            status: sendEmails ? "Applied" : "Ready",
            coverLetter,
            timeline: [
              {
                status: sendEmails ? "Applied" : "Ready",
                timestamp: new Date().toISOString(),
                note: sendEmails
                  ? "Application submitted via Auto-Pilot"
                  : "Prepared by Auto-Pilot, ready for review",
              },
            ],
          },
        });

        let emailSent = false;
        if (sendEmails) {
          try {
            const emailRes = await fetch(`${req.nextUrl.origin}/api/send-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: job.url.includes("mailto:") ? job.url.replace("mailto:", "") : "",
                fromEmail: email,
                fromName: name,
                subject: `Application for ${job.title} at ${job.company}`,
                coverLetter: coverLetter || `I am writing to apply for the ${job.title} position at ${job.company}.`,
                resumeData: resumeContent,
              }),
            });
            const emailData = await emailRes.json();
            emailSent = emailData.success || false;
          } catch (e: any) {
            logger.warn({ error: e.message, job: job.id }, "Email send failed");
          }
        }

        return {
          jobId: job.id,
          company: job.company,
          role: job.title,
          atsScore: atsResult.score,
          breakdown: atsResult.breakdown,
          keywordAnalysis: atsResult.keywordAnalysis,
          coverLetterGenerated: !!coverLetter,
          applicationId: application.id,
          emailSent,
          status: sendEmails ? "Applied" : "Ready",
        };
      })
    );

    const successful: any[] = [];
    const failed: any[] = [];

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        successful.push(r.value);
      } else {
        failed.push({ jobId: jobs[idx].id, error: r.reason?.message || "Unknown error" });
      }
    });

    return NextResponse.json({
      results: successful,
      failed,
      summary: {
        total: jobs.length,
        successful: successful.length,
        failed: failed.length,
        averageAtsScore: successful.length > 0
          ? Math.round(successful.reduce((s, r) => s + r.atsScore, 0) / successful.length)
          : 0,
        applied: successful.filter((r) => r.emailSent).length,
      },
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "Auto-pilot apply error:");
    return NextResponse.json(
      { error: error?.message || "Auto-pilot apply failed" },
      { status: 500 }
    );
  }
}
