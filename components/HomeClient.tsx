"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import TopBar from "@/components/TopBar";
import Leaderboard from "@/components/Leaderboard";
import PayModal from "@/components/PayModal";
import Spinner from "@/components/Spinner";
import ClaimBanner from "@/components/ClaimBanner";
import { useLeaderboard } from "@/lib/useLeaderboard";
import { CurrentUser } from "@/lib/types";

export default function HomeClient({ currentUser }: { currentUser: CurrentUser | null }) {
  const { users, loading, prevRanks } = useLeaderboard();
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();

  const topAmount = users[0] ? users[0].totalPaid + 1 : 1;

  // If we got here via a "log in, then continue to payment" redirect
  // (see handlePayClick below), pick up where the guest left off,
  // including whatever amount they were about to pay if they came
  // from the "Claim #1" banner.
  useEffect(() => {
    if (currentUser && searchParams.get("pay") === "1") {
      const amountParam = searchParams.get("amount");
      setPrefillAmount(amountParam ? Number(amountParam) : undefined);
      setPayOpen(true);
      router.replace("/"); // drop the query string so refresh/back doesn't reopen it
    }
  }, [currentUser, searchParams, router]);

  function handlePayClick(amount?: number) {
    if (!currentUser) {
      const redirectPath = amount ? `/?pay=1&amount=${amount}` : "/?pay=1";
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setPrefillAmount(amount);
    setPayOpen(true);
  }

  async function handlePay(amount: number) {
    if (!currentUser) return; // guarded by handlePayClick, but keeps TS happy
    setPayError(null);

    // 1. Ask our server to open a Razorpay order — this also inserts a
    //    'created' payments row, which cannot count toward total_paid
    //    until it's verified below.
    const orderRes = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    if (!orderRes.ok) {
      const body = await orderRes.json().catch(() => ({}));
      setPayError(body.error ?? "Could not start payment.");
      return;
    }

    const order = await orderRes.json();

    if (typeof window === "undefined" || !window.Razorpay) {
      setPayError("Payment script hasn't loaded yet — try again in a moment.");
      return;
    }

    // 2. Open Razorpay's hosted checkout modal with that order.
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "cultbid.in",
      description: "Climb the leaderboard",
      prefill: { name: currentUser.name },
      theme: { color: "#ff2ea6" },
      handler: async (response) => {
        // 3. Send the three fields Razorpay returns to our server for
        //    signature verification — never trust them just because the
        //    browser handed them back; they could be forged client-side.
        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });

        if (!verifyRes.ok) {
          const body = await verifyRes.json().catch(() => ({}));
          setPayError(body.error ?? "Payment could not be verified.");
          return;
        }

        // No local state update needed — the Realtime subscription in
        // useLeaderboard() picks up the DB trigger's total_paid change
        // (fired the moment /verify marks the row 'captured') and
        // animates it in, the same way it does for every other viewer.
        setPayOpen(false);
      },
      modal: {
        ondismiss: () => {
          // User closed the modal without paying — the 'created' row
          // just sits there unconfirmed. Nothing to clean up.
        },
      },
    });

    rzp.on("payment.failed", (resp) => {
      setPayError(resp.error?.description ?? "Payment failed.");
    });

    rzp.open();
  }

  return (
    <main className="relative min-h-screen">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="grain" />
      <TopBar currentUser={currentUser} onPay={() => handlePayClick()} />

      {!loading && <ClaimBanner amount={topAmount} onClaim={() => handlePayClick(topAmount)} />}

      {loading ? (
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-10 text-sm text-muted">
          <Spinner className="h-4 w-4 text-neon" />
          Loading leaderboard…
        </div>
      ) : (
        <Leaderboard users={users} prevRanks={prevRanks} />
      )}

      <PayModal
        open={payOpen}
        error={payError}
        initialAmount={prefillAmount}
        onClose={() => setPayOpen(false)}
        onConfirm={handlePay}
      />
    </main>
  );
}
