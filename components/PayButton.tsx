"use client";

import { motion } from "framer-motion";

export default function PayButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="rounded-full bg-neon px-4 py-2 text-sm font-semibold text-void shadow-neon comic-shadow border-2 border-black transition-shadow hover:shadow-[0_0_32px_rgba(255,46,166,0.65)] sm:px-5"
    >
      Pay
    </motion.button>
  );
}
