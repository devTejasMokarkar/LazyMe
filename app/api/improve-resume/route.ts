import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { calculateATS } from "@/utils/ats";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const prompt = `Improve this resume based on job description.

Return JSON only with this exact shape:
{
  "improvedResume": { ... },
  "changes": ["string"]
}

Keep concise. Add missing skills if relevant but do not hallucinate fake experience. Make sure to return the exact same resume structure.
Resume: ${JSON.stringify(resume)}
JD: ${jobDescription}
`;

    const response = await generateText(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    
    const { improvedResume, changes } = JSON.parse(jsonStr);

    const newATS = calculateATS(improvedResume, jobDescription);

    return NextResponse.json({
      improvedResume,
      changes,
      newATS
    });
  } catch (error: any) {
    console.error("Improve resume error:", error);
    return NextResponse.json({ error: "Failed to improve resume" }, { status: 500 });
  }
}
