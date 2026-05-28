import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addCredits } from "@/lib/credits";
import { logger } from "@/lib/logger";

/**
 * POST /api/payments/webhooks/paypal — PayPal webhook handler
 * Verifies event and credits user account on capture completed.
 */
export async function POST(req: NextRequest) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
  }

  const body = await req.json();
  const eventType = body.event_type;

  // Verify webhook signature with PayPal
  const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (webhookId) {
    try {
      const authResponse = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const authData = await authResponse.json();

      const verifyResponse = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_id: webhookId,
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          cert_url: req.headers.get("paypal-cert-url"),
          auth_algo: req.headers.get("paypal-auth-algo"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          webhook_event: body,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyData.verification_status !== "SUCCESS") {
        logger.warn("PayPal webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch (err: any) {
      logger.error({ error: err.message }, "PayPal webhook verification error");
    }
  }

  if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.APPROVED") {
    const resource = body.resource;
    const orderId = resource?.supplementary_data?.related_ids?.order_id || resource?.id;

    if (!orderId) {
      logger.warn({ body }, "PayPal webhook missing order ID");
      return NextResponse.json({ received: true });
    }

    // Find our payment by gateway payment ID
    const payment = await prisma.payment.findFirst({
      where: { gatewayPaymentId: orderId, gateway: "paypal" },
    });

    if (!payment || payment.status === "completed") {
      return NextResponse.json({ received: true, message: payment ? "Already processed" : "Payment not found" });
    }

    // If order approved, capture it
    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      try {
        const authResponse = await fetch(`${base}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });
        const authData = await authResponse.json();

        await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authData.access_token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (err: any) {
        logger.error({ error: err.message }, "PayPal capture failed");
      }
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "completed" },
    });

    await addCredits(
      payment.userId,
      payment.credits,
      "purchase",
      `Purchased ${payment.credits} credits via PayPal`,
      payment.id
    );

    logger.info({ userId: payment.userId, credits: payment.credits }, "PayPal payment completed");
  }

  return NextResponse.json({ received: true });
}
