import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { addCredits } from "@/features/credits/credits.service";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";

/**

export const dynamic = "force-dynamic";
 * POST /api/payments/verify — Client-side payment verification (Razorpay)
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  // Verify Razorpay signature
  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    logger.warn({ razorpay_order_id }, "Razorpay payment verification failed — signature mismatch");
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Find the payment and ensure it belongs to this user
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, userId: session.user.id, gateway: "razorpay" },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ success: true, message: "Already verified" });
  }

  // Mark as completed and add credits
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "completed",
      gatewayPaymentId: razorpay_payment_id,
    },
  });

  const newBalance = await addCredits(
    session.user.id,
    payment.credits,
    "purchase",
    `Purchased ${payment.credits} credits via Razorpay`,
    payment.id
  );

  logger.info({
    userId: session.user.id,
    credits: payment.credits,
    paymentId: payment.id,
  }, "Razorpay payment verified client-side");

  return NextResponse.json({ success: true, newBalance, credits: payment.credits });
}
