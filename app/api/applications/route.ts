import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      include: {
        job: true,
        resume: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      jobId, 
      resumeId, 
      status, 
      coverLetter, 
      jobData 
    } = body;

    let targetJobId = jobId;

    // If jobData is provided, ensure the job exists in the Job table
    if (jobData && !jobId) {
      const job = await prisma.job.upsert({
        where: { id: jobData.id || `manual-${Date.now()}` },
        update: {
          title: jobData.role || jobData.title,
          company: jobData.company,
          location: jobData.location,
          matchScore: jobData.matchScore,
          matchFactors: jobData.matchFactors,
        },
        create: {
          id: jobData.id || `manual-${Date.now()}`,
          title: jobData.role || jobData.title,
          company: jobData.company,
          location: jobData.location,
          description: jobData.description || "",
          source: jobData.source || "Discovery",
          applyUrl: jobData.applyUrl,
          matchScore: jobData.matchScore,
          matchFactors: jobData.matchFactors,
        },
      });
      targetJobId = job.id;
    }

    if (!targetJobId) {
      return NextResponse.json({ error: "Missing Job ID or data" }, { status: 400 });
    }

    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jobId: targetJobId,
        resumeId,
        status: status || "Applied",
        coverLetter,
        timeline: [
          {
            status: status || "Applied",
            timestamp: new Date().toISOString(),
            note: "Application created via LazyMe AI",
          },
        ],
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error("Failed to create application:", error);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, note } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing application ID or status" }, { status: 400 });
    }

    const existing = await prisma.application.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Update timeline
    const timeline = (existing.timeline as any[]) || [];
    timeline.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${status}`,
    });

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status,
        timeline,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing application ID" }, { status: 400 });
    }

    await prisma.application.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
