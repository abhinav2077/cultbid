import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing verification fields." }, { status: 400 });
  }

  // This is the checkout-success signature: HMAC-SHA256 of
  // "order_id|payment_id" using your key_secret. It proves the three
  // values genuinely came from Razorpay and weren't forged in the
  // browser — never trust these fields before this check passes.
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const signatureBuffer = Buffer.from(razorpay_signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  const valid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // service_role bypasses RLS — this is the one place a payment is
  // allowed to become 'captured'. The .eq("status", "created") clause
  // makes this idempotent: if the webhook already captured this order,
  // this update matches zero rows instead of double-counting.
  const service = createServiceClient();
  const { error } = await service
    .from("payments")
    .update({ status: "captured", provider_payment_id: razorpay_payment_id })
    .eq("provider_order_id", razorpay_order_id)
    .eq("user_id", user.id)
    .eq("status", "created");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
