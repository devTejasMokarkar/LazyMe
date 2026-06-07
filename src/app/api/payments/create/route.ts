import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { CREDIT_PACKS } from "@/features/credits/credits.service";
import Stripe from "stripe";
import Razorpay from "razorpay";

/**

export const dynamic = "force-dynamic";
 * POST /api/payments/create — Create a payment session
 * Body: { packId: string, gateway: "stripe" | "paypal" | "razorpay" }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { packId, gateway } = body;

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
  }

  // Create a pending payment record
  const payment = await prisma.payment.create({
    data: {
      userId: session.user.id,
      gateway,
      amount: gateway === "razorpay" ? pack.priceINR : pack.priceUSD,
      currency: gateway === "razorpay" ? "INR" : "USD",
      credits: pack.credits,
      status: "pending",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    switch (gateway) {
      case "stripe": {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "payment",
          customer_email: session.user.email,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `${pack.label} — ${pack.credits} Credits`,
                  description: `LazyMe AI credit pack: ${pack.credits} credits`,
                },
                unit_amount: pack.priceUSD,
              },
              quantity: 1,
            },
          ],
          metadata: {
            paymentId: payment.id,
            userId: session.user.id,
            credits: String(pack.credits),
          },
          success_url: `${appUrl}/settings?payment=success&credits=${pack.credits}`,
          cancel_url: `${appUrl}/settings?payment=cancelled`,
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { gatewayPaymentId: checkoutSession.id },
        });

        return NextResponse.json({ url: checkoutSession.url, paymentId: payment.id });
      }

      case "razorpay": {
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!razorpayKeyId || !razorpaySecret) {
          return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
        }

        const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpaySecret });
        const order = await razorpay.orders.create({
          amount: pack.priceINR,
          currency: "INR",
          receipt: payment.id,
          notes: {
            paymentId: payment.id,
            userId: session.user.id,
            credits: String(pack.credits),
          },
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { gatewayOrderId: order.id, gatewayPaymentId: order.id },
        });

        return NextResponse.json({
          orderId: order.id,
          amount: pack.priceINR,
          currency: "INR",
          paymentId: payment.id,
          keyId: razorpayKeyId,
        });
      }

      case "paypal": {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return NextResponse.json({ error: "PayPal not configured" }, { status: 500 });
        }

        // Get PayPal access token
        const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
        const authResponse = await fetch(`${base}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });

        const authData = await authResponse.json();
        const accessToken = authData.access_token;

        // Create PayPal order
        const priceUSD = (pack.priceUSD / 100).toFixed(2);
        const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                reference_id: payment.id,
                description: `${pack.label} — ${pack.credits} Credits`,
                amount: {
                  currency_code: "USD",
                  value: priceUSD,
                },
              },
            ],
            application_context: {
              return_url: `${appUrl}/settings?payment=success&credits=${pack.credits}`,
              cancel_url: `${appUrl}/settings?payment=cancelled`,
            },
          }),
        });

        const orderData = await orderResponse.json();
        const approveUrl = orderData.links?.find((l: any) => l.rel === "approve")?.href;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { gatewayPaymentId: orderData.id },
        });

        return NextResponse.json({ url: approveUrl, paymentId: payment.id });
      }

      default:
        return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
    }
  } catch (error: any) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: error.message || "Payment creation failed" }, { status: 500 });
  }
}
