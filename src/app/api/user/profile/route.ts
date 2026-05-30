import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    });

    const resume = await prisma.userResume.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    const content = resume?.content as any;

    profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        id: session.user.id,
        userId: session.user.id,
        email: user?.email || "",
        fullName: user?.name || null,
        avatarUrl: user?.image || null,
        jobTitle: content?.title || null,
        bio: content?.summary || null,
        updatedAt: new Date(),
      },
      update: {},
    });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "bio", "jobTitle", "preferredName",
    "linkedinUrl", "githubUrl", "portfolioUrl",
  ];

  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      update[key] = body[key] || null;
    }
  }

  const profile = await prisma.profile.update({
    where: { userId: session.user.id },
    data: update,
  });

  return NextResponse.json({ profile });
}
