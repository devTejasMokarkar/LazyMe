import { NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { getBalance, getTransactions } from "@/features/credits/credits.service";

/**
 * GET /api/user/credits — Get current balance + recent transactions
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [balance, transactions] = await Promise.all([
    getBalance(session.user.id),
    getTransactions(session.user.id, 20),
  ]);

  return NextResponse.json({
    balance,
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      operation: t.operation,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt,
    })),
  });
}
