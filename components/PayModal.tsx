"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Spinner from "./Spinner";

export default function PayModal({
  open,
  error,
  initialAmount,
  onClose,
  onConfirm,
}: {
  open: boolean;
  error?: string | null;
  initialAmount?: number;
  onClose: () => void;
  onConfirm: (amount: number) => void | Promise<void>;
}) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    const value = parseInt(amount || "0", 10);
    if (value <= 0) return;
    setSubmitting(true);
    await onConfirm(value);
    setSubmitting(false);
    setAmount("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-surface2 p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Climb the list</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-muted hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <label className="mb-1.5 block text-xs font-medium text-muted">Amount (₹)</label>
            <input
              autoFocus
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="5000"
              className="mb-2 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 font-mono text-lg text-white outline-none focus-visible:border-neon"
            />

            {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-semibold text-void shadow-neon transition-shadow hover:shadow-[0_0_32px_rgba(255,46,166,0.65)] disabled:opacity-60"
            >
              {submitting && <Spinner className="h-4 w-4 text-void" />}
              {submitting ? "Processing…" : "Confirm payment"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
