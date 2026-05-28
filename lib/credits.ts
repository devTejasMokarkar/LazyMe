import { prisma } from "./db";
import { logger } from "./logger";

// ── Credit costs per operation ───────────────────────────────
export const CREDIT_COSTS: Record<string, number> = {
  resume_gen: 5,
  resume_improve: 5,
  ats_analysis: 3,
  cover_letter: 3,
  job_discovery: 2,
  interview_prep: 5,
  parse_resume: 2,
  general_ai: 2,
};

// ── Credit packs ─────────────────────────────────────────────
export const CREDIT_PACKS = [
  { id: "pack_100", credits: 100, priceINR: 9900, priceUSD: 199, label: "Starter" },
  { id: "pack_500", credits: 500, priceINR: 39900, priceUSD: 699, label: "Pro" },
  { id: "pack_2000", credits: 2000, priceINR: 99900, priceUSD: 1999, label: "Unlimited" },
] as const;

export const FREE_CREDITS = 50;

export class InsufficientCreditsError extends Error {
  balance: number;
  required: number;

  constructor(balance: number, required: number) {
    super(`Insufficient credits: have ${balance}, need ${required}`);
    this.name = "InsufficientCreditsError";
    this.balance = balance;
    this.required = required;
  }
}

/**
 * Get the current credit balance for a user. Creates if not exists.
 */
export async function getBalance(userId: string): Promise<number> {
  const record = await prisma.creditBalance.upsert({
    where: { userId },
    create: { userId, balance: FREE_CREDITS, totalEarned: FREE_CREDITS },
    update: {},
  });
  return record.balance;
}

/**
 * Initialize free credits for a new user.
 */
export async function initializeCredits(userId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.creditBalance.findUnique({ where: { userId } });
      if (existing) return; // Already initialized

      await tx.creditBalance.create({
        data: {
          userId,
          balance: FREE_CREDITS,
          totalEarned: FREE_CREDITS,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: FREE_CREDITS,
          type: "bonus",
          description: "Welcome bonus — free credits on signup",
          operation: null,
          balanceAfter: FREE_CREDITS,
        },
      });
    });

    logger.info({ userId, credits: FREE_CREDITS }, "Credits initialized for new user");
  } catch (error: any) {
    // Unique constraint = already initialized, safe to ignore
    if (error.code === "P2002") return;
    throw error;
  }
}

/**
 * Deduct credits for an AI operation. Returns false if insufficient balance.
 * Uses a transaction to prevent race conditions.
 */
export async function deductCredits(
  userId: string,
  operation: string,
  description: string
): Promise<boolean> {
  const cost = CREDIT_COSTS[operation] ?? CREDIT_COSTS.general_ai;

  try {
    await prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({ where: { userId } });

      if (!balance || balance.balance < cost) {
        throw new InsufficientCreditsError(balance?.balance ?? 0, cost);
      }

      const newBalance = balance.balance - cost;

      await tx.creditBalance.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalSpent: { increment: cost },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -cost,
          type: "usage",
          description,
          operation,
          balanceAfter: newBalance,
        },
      });
    });

    return true;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      logger.warn({ userId, operation, cost, balance: error.balance }, "Insufficient credits");
      return false;
    }
    throw error;
  }
}

/**
 * Add credits to a user's balance (after purchase or bonus).
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: "purchase" | "bonus" | "refund",
  description: string,
  paymentId?: string
): Promise<number> {
  const result = await prisma.$transaction(async (tx) => {
    const balance = await tx.creditBalance.upsert({
      where: { userId },
      create: {
        userId,
        balance: amount,
        totalEarned: amount,
      },
      update: {
        balance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
        paymentId,
        balanceAfter: balance.balance,
      },
    });

    return balance.balance;
  });

  logger.info({ userId, amount, type, newBalance: result }, "Credits added");
  return result;
}

/**
 * Get recent credit transactions for a user.
 */
export async function getTransactions(userId: string, limit: number = 20) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
