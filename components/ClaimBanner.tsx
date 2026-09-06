"use client";

import { formatINR } from "@/lib/format";

export default function ClaimBanner({ amount, onClaim }: { amount: number; onClaim: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-14 pb-8 text-center sm:px-6 sm:pt-20 sm:pb-10">
      <p className="comic-text text-3xl text-comicYellow">
        Claim <span className="font-semibold text-neon">#1</span> spot now for{" "}
        <span className="font-semibold text-neon">{formatINR(amount)}</span>
      </p>
      <button
  onClick={onClaim}
  className="comic-shadow mt-4 rounded-full border-2 border-black bg-neon px-6 py-2.5 text-sm font-semibold text-void !shadow-[0_0_32px_rgba(255,46,166,0.65)] transition-shadow"
>
  Pay & take the lead
</button>
    </section>
  );
}
