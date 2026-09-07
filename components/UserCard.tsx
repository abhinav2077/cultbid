"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import instaIcon from "@/app/insta.png";
import xIcon from "@/app/x.png";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { ArrowUp, ArrowDown, Facebook, Youtube, Link as LinkIcon } from "lucide-react";
import confetti from "canvas-confetti";
import { CultUser } from "@/lib/types";
import { formatINR } from "@/lib/format";
import clsx from "clsx";

const RANK_STYLES: Record<number, { key: "gold" | "silver" | "bronze"; text: string }> = {
  1: { key: "gold", text: "text-gold" },
  2: { key: "silver", text: "text-silver" },
  3: { key: "bronze", text: "text-bronze" },
};

// Original brand colors for each platform, rather than a flat white icon.
const BRAND_COLORS = {
  instagram: "#E4405F",
  twitter: "#1DA1F2",
  facebook: "#1877F2",
  youtube: "#FF0000",
};

export default function UserCard({
  user,
  rank,
  prevRank,
  celebrate,
}: {
  user: CultUser;
  rank: number;
  prevRank: number | undefined;
  /** True exactly once, for whoever is #1 the first time the leaderboard loads. */
  celebrate?: boolean;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [scope, animate] = useAnimate();
  const mounted = useRef(false);
  const celebrated = useRef(false);

  const topStyle = RANK_STYLES[rank + 1];
  const socialCount = Object.values(user.socials).filter(Boolean).length;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (prevRank === undefined || prevRank === rank) return;
    setFlash(prevRank > rank ? "up" : "down");
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [rank, prevRank]);

  // One-time pop + golden confetti burst for whoever is #1 when the page loads.
  useEffect(() => {
    if (!celebrate || celebrated.current || !scope.current) return;
    celebrated.current = true;

    const timer = setTimeout(async () => {
      if (!scope.current) return;
      await animate(scope.current, { scale: [1, 1.08, 1] }, { duration: 0.5, ease: "easeOut" });

      const rect = scope.current.getBoundingClientRect();
      const origin = {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      };
      const colors = ["#f4c95d", "#FFD700", "#FFF3CF", "#FFA500", "#ffffff"];

      // Two staggered bursts with different shapes read as an actual
      // party-popper blast rather than a single flat puff.
      confetti({
        particleCount: 90,
        spread: 110,
        startVelocity: 42,
        gravity: 1.1,
        scalar: 1.1,
        shapes: ["star"],
        colors,
        origin,
      });
      confetti({
        particleCount: 70,
        spread: 140,
        startVelocity: 32,
        gravity: 1,
        shapes: ["circle", "square"],
        colors,
        origin,
      });
    }, 450);

    return () => clearTimeout(timer);
  }, [celebrate, animate, scope]);

  return (
    <motion.li
      layout
      layoutId={user.id}
      transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.9 }}
      className="relative list-none"
    >
      <div
        ref={scope}
        className={clsx(
          "relative",
          topStyle ? `comet-ring comet-ring--${topStyle.key}` : "rounded-2xl border-2 border-neon"
        )}
      >
        {rank === 0 && (
          <div className="starburst">
            <span />
            <span />
            <b>TOP</b>
          </div>
        )}

        <div className="comet-ring-content rounded-2xl bg-surface">
          <div className="flex items-center gap-3 px-3.5 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
            <span
              className={clsx(
                "w-6 shrink-0 text-center tabular-nums sm:w-7",
                topStyle
                  ? clsx("comic-text text-base sm:text-lg", topStyle.text)
                  : "font-mono text-xs text-muted sm:text-sm"
              )}
            >
              {rank + 1}
            </span>

            <Image
              src={user.avatar}
              alt={user.name}
              width={40}
              height={40}
              unoptimized
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10 sm:h-10 sm:w-10"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/95 sm:text-[15px]">{user.name}</p>
              <p className="truncate text-xs text-muted">@{user.handle}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <AnimatePresence>
                {flash && (
                  <motion.span
                    initial={{ opacity: 0, y: flash === "up" ? 6 : -6, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={clsx(
                      "flex items-center",
                      flash === "up" ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {flash === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  </motion.span>
                )}
              </AnimatePresence>

              <span className="font-mono text-sm font-semibold tabular-nums text-white sm:text-[15px]">
                {formatINR(user.totalPaid)}
              </span>
            </div>
          </div>

          {socialCount > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line/70 px-3.5 py-3 sm:px-4">
              {user.socials.instagram && (
  <SocialPill href={user.socials.instagram} label="Instagram">
    <Image src={instaIcon} alt="Instagram" width={14} height={14} unoptimized />
  </SocialPill>
)}
{user.socials.twitter && (
  <SocialPill href={user.socials.twitter} label="X / Twitter">
    <Image src={xIcon} alt="X" width={14} height={14} unoptimized />
  </SocialPill>
)}
              {user.socials.facebook && (
                <SocialPill href={user.socials.facebook} label="Facebook" color={BRAND_COLORS.facebook}>
                  <Facebook size={14} />
                </SocialPill>
              )}
              {user.socials.youtube && (
                <SocialPill href={user.socials.youtube} label="YouTube" color={BRAND_COLORS.youtube}>
                  <Youtube size={14} />
                </SocialPill>
              )}
              {user.socials.custom1 && (
                <SocialPill href={user.socials.custom1.url} label={user.socials.custom1.label}>
                  <LinkIcon size={12} />
                </SocialPill>
              )}
              {user.socials.custom2 && (
                <SocialPill href={user.socials.custom2.url} label={user.socials.custom2.label}>
                  <LinkIcon size={14} />
                </SocialPill>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function SocialPill({
  href,
  label,
  color,
  children,
}: {
  href: string;
  label: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-neon/50 hover:text-white"
    >
      <span style={color ? { color } : undefined}>{children}</span>
      {label}
    </a>
  );
}
