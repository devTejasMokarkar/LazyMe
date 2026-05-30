import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/config/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ title: '', skills: [], location: '' });
    }

    const resume = await prisma.userResume.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    if (!resume) {
      return NextResponse.json({ title: '', skills: [], location: '' });
    }

    const content = typeof resume.content === 'string' 
      ? JSON.parse(resume.content) 
      : resume.content;

    return NextResponse.json({
      title: content.title || content.role || '',
      skills: content.skills || [],
      location: content.location || '',
      experience: content.experience || []
    });
   } catch (error: any) {
     logger.error({ error: error?.message || error }, 'Error fetching resume:');
     return NextResponse.json({ title: '', skills: [], location: '' });
   }
}