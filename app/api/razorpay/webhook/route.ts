import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/serviceClient";

/**
 * Razorpay calls this server-to-server, independent of any open browser
 * tab — it's what catches the case where a user pays but closes the tab
 * (or loses signal) before /api/razorpay/verify ever runs. Configure the
 * URL for this route in the Razorpay Dashboard → Webhooks, and set the
 * *webhook secret* you choose there as RAZORPAY_WEBHOOK_SECRET — it's a
 * separate secret from your API key_secret.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  const valid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!valid) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const service = createServiceClient();

  // Razorpay retries webhooks that don't return 2xx, and can send the
  // same event more than once regardless — the .eq("status", "created")
  // clause on every branch is what makes each handler safe to run twice.
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    await service
      .from("payments")
      .update({ status: "captured", provider_payment_id: payment.id })
      .eq("provider_order_id", payment.order_id)
      .eq("status", "created");
  }

  if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;
    await service
      .from("payments")
      .update({ status: "failed", provider_payment_id: payment.id })
      .eq("provider_order_id", payment.order_id)
      .eq("status", "created");
  }

  return NextResponse.json({ ok: true });
}
