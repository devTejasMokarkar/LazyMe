const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL || "llama3.2";

async function main() {
  const prompt = "Hi, how can you help me enhance a resume from a short chat message?";

  console.log(`Testing Ollama at ${baseUrl}`);
  console.log(`Model: ${model}`);
  console.log(`Prompt: ${prompt}\n`);

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: 160,
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Ollama returned HTTP ${response.status}`);
  }

  console.log("Ollama response:\n");
  console.log(data?.response || "(empty response)");
}

main().catch((error) => {
  console.error("\nOllama test failed:");
  console.error(error.message);
  process.exit(1);
});
