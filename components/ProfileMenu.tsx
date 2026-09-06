"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, UserPen, LogOut } from "lucide-react";
import { CurrentUser } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function ProfileMenu({ currentUser }: { currentUser: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 transition-colors hover:border-white/20"
        aria-expanded={open}
      >
        <Image
          src={currentUser.avatar}
          alt={currentUser.name}
          width={28}
          height={28}
          unoptimized
          className="h-7 w-7 rounded-full object-cover"
        />
        <span className="max-w-[7rem] truncate text-sm font-medium text-white/90">
          {currentUser.name}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-muted" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-surface2 p-1 shadow-2xl"
          >
            <a
              href="/profile/edit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/5"
            >
              <UserPen size={15} className="text-muted" />
              Edit profile
            </a>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/5"
            >
              <LogOut size={15} className="text-muted" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
