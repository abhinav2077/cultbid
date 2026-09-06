import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { razorpay } from "@/lib/razorpay";

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
  const amount = Number(body?.amount);

  if (!amount || !Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Minimum amount is ₹1." }, { status: 400 });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error(
      "Razorpay is not configured: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing at runtime."
    );
    return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 500 });
  }

  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    console.error(
      "NEXT_PUBLIC_RAZORPAY_KEY_ID is missing — checkout.js needs this in the browser bundle."
    );
    return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 500 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay wants paise, not rupees
      currency: "INR",
      receipt: `cultbid_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { user_id: user.id },
    });

    // Insert as 'created' — the insert RLS policy enforces this status,
    // so this row cannot count toward total_paid until the server moves
    // it to 'captured' after verifying Razorpay's signature.
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      amount,
      provider: "razorpay",
      provider_order_id: order.id,
      status: "created",
    });

    if (error) {
      console.error("Supabase insert error (payments):", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    // Surface the real reason instead of letting the client fall back
    // to a generic message — check your Vercel function logs for this
    // exact line if payments ever fail again.
    console.error("Razorpay order creation failed:", err);
    const message = err instanceof Error ? err.message : "Could not create Razorpay order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
