import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await prisma.userResume.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(resumes);
   } catch (error) {
     logger.error("GET /api/resumes error:", error);
     return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
   }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, content, rawText, version, isDefault } = body;

    if (!content) {
      return NextResponse.json({ error: "Missing resume content" }, { status: 400 });
    }

    // If isDefault is true, unset other default resumes
    if (isDefault) {
      await prisma.userResume.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const resume = await prisma.userResume.create({
      data: {
        userId: session.user.id,
        name: name || "My Resume",
        content,
        rawText,
        version: version || 1,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(resume);
   } catch (error) {
     logger.error("Failed to save resume:", error);
     return NextResponse.json({ error: "Failed to save resume" }, { status: 500 });
   }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 });
    }

    // Ensure the resume belongs to the user
    const existing = await prisma.userResume.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // If isDefault is true, unset other default resumes
    if (data.isDefault) {
      await prisma.userResume.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userResume.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update resume" }, { status: 500 });
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
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 });
    }

    await prisma.userResume.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
  }
}
