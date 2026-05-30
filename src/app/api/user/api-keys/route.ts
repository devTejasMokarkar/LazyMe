import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/encryption";
import { generateWithUserKey } from "@/features/ai/ai.service";

/**
 * GET /api/user/api-keys — List user's API keys (masked)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.userApiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      isActive: true,
      label: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

/**
 * POST /api/user/api-keys — Add or update an API key
 * Body: { provider: "gemini" | "openrouter" | "openai", apiKey: string, label?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider, apiKey, label } = body;

  if (!provider || !apiKey) {
    return NextResponse.json({ error: "provider and apiKey are required" }, { status: 400 });
  }

  const validProviders = ["gemini", "openrouter", "openai"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: `Invalid provider. Must be one of: ${validProviders.join(", ")}` }, { status: 400 });
  }

  // Validate the key by making a test call
  const testResult = await generateWithUserKey("Reply with exactly: OK", provider, apiKey);
  if (!testResult) {
    return NextResponse.json({ error: "API key validation failed. Please check the key and try again." }, { status: 400 });
  }

  // Encrypt the key
  const { encrypted, iv } = encryptApiKey(apiKey);

  // Upsert (one key per provider per user)
  const key = await prisma.userApiKey.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider,
      },
    },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey: encrypted,
      iv,
      label: label || `My ${provider} key`,
      isActive: true,
    },
    update: {
      encryptedKey: encrypted,
      iv,
      label: label || undefined,
      isActive: true,
    },
  });

  return NextResponse.json({
    success: true,
    key: {
      id: key.id,
      provider: key.provider,
      isActive: key.isActive,
      label: key.label,
      maskedKey: maskApiKey(apiKey),
    },
  });
}

/**
 * DELETE /api/user/api-keys — Remove an API key
 * Body: { provider: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { provider } = body;

  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  await prisma.userApiKey.deleteMany({
    where: {
      userId: session.user.id,
      provider,
    },
  });

  return NextResponse.json({ success: true });
}
