import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/resumes/cleanup
 * Keeps only the most recently updated resume for the current user and
 * deletes all older rows (duplicates left by the old double-save bug).
 * Call this once from the browser to clean up your DB.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Find all resumes for this user, newest first
  const all = await prisma.userResume.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true },
  });

  if (all.length <= 1) {
    return NextResponse.json({ message: "Nothing to clean up", kept: all });
  }

  const [keep, ...remove] = all;

  // Mark the kept one as default
  await prisma.userResume.update({
    where: { id: keep.id },
    data: { isDefault: true },
  });

  // Delete the rest
  await prisma.userResume.deleteMany({
    where: { id: { in: remove.map((r) => r.id) } },
  });

  return NextResponse.json({
    message: `Deleted ${remove.length} old resume(s)`,
    kept: keep,
    deleted: remove.length,
  });
}
