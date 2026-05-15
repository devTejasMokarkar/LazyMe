import ResumeBuilder from "@/components/ResumeBuilder";

export default function Page({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const prompt = typeof searchParams.prompt === 'string' ? searchParams.prompt : undefined;
  return <ResumeBuilder initialPrompt={prompt} />;
}
