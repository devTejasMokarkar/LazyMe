import { NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [activities, user] = await Promise.all([
    prisma.loginActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    }),
  ]);

  return NextResponse.json({
    activities,
    user: {
      name: user?.name || null,
      email: user?.email || null,
      image: user?.image || null,
    },
  });
}
