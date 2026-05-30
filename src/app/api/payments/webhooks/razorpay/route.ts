import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addCredits } from "@/features/credits/credits.service";
import { logger } from "@/lib/logger";
import { createHmac } from "crypto";

/**
 * POST /api/payments/webhooks/razorpay — Razorpay webhook handler
 * Verifies HMAC signature and credits user account on payment captured.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Razorpay webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify HMAC SHA-256 signature
  const expectedSignature = createHmac("sha256", webhookSecret).update(body).digest("hex");

  if (signature !== expectedSignature) {
    logger.warn("Razorpay webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const eventType = event.event;

  if (eventType === "payment.captured") {
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const razorpayPaymentId = paymentEntity?.id;

    if (!orderId) {
      logger.warn({ event }, "Razorpay webhook missing order_id");
      return NextResponse.json({ received: true });
    }

    // Find our payment by Razorpay order ID
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: orderId, gateway: "razorpay" },
    });

    if (!payment || payment.status === "completed") {
      return NextResponse.json({
        received: true,
        message: payment ? "Already processed" : "Payment not found",
      });
    }

    // Update payment and credit user
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "completed",
        gatewayPaymentId: razorpayPaymentId || orderId,
      },
    });

    await addCredits(
      payment.userId,
      payment.credits,
      "purchase",
      `Purchased ${payment.credits} credits via Razorpay`,
      payment.id
    );

    logger.info({
      userId: payment.userId,
      credits: payment.credits,
      paymentId: payment.id,
    }, "Razorpay payment completed — credits added");
  }

  return NextResponse.json({ received: true });
}
