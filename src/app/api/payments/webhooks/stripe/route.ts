import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addCredits } from "@/features/credits/credits.service";
import { logger } from "@/lib/logger";
import Stripe from "stripe";

/**
 * POST /api/payments/webhooks/stripe — Stripe webhook handler
 * Verifies signature, credits user account on successful payment.
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    logger.error({ error: err.message }, "Stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { paymentId, userId, credits } = session.metadata || {};

    if (!paymentId || !userId || !credits) {
      logger.warn({ metadata: session.metadata }, "Stripe webhook missing metadata");
      return NextResponse.json({ received: true });
    }

    // Check if already processed
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (payment?.status === "completed") {
      return NextResponse.json({ received: true, message: "Already processed" });
    }

    // Update payment and credit user
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "completed",
        gatewayPaymentId: session.payment_intent as string || session.id,
      },
    });

    await addCredits(userId, parseInt(credits), "purchase", `Purchased ${credits} credits via Stripe`, paymentId);

    logger.info({ userId, credits, paymentId }, "Stripe payment completed — credits added");
  }

  return NextResponse.json({ received: true });
}
