"use client";

import { useRef } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { CultUser } from "@/lib/types";
import UserCard from "./UserCard";

export default function Leaderboard({
  users,
  prevRanks,
}: {
  users: CultUser[];
  prevRanks: Map<string, number>;
}) {
  // Captured once, the first time the list has data — whoever is #1 at
  // that moment gets the pop + confetti entrance. Later real-time
  // reorders (someone else taking #1) never retrigger it; that's only
  // for "opening the site", not every leadership change.
  const celebrateId = useRef<string | null>(null);
  if (celebrateId.current === null && users.length > 0) {
    celebrateId.current = users[0].id;
  }

  return (
    <section className="halftone relative mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="comic-text text-2xl text-comicYellow">The list</h1>
        <p className="text-xs text-muted">{users.length} ranked · live</p>
      </div>

            {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="comic-text text-3xl sm:text-4xl">
            <span className="text-neon">Be the First.</span>{" "}
            <span className="text-comicYellow">Claim #1 Now!</span>
          </p>
        </div>
      ) : (
        <LayoutGroup>
          <motion.ul layout className="flex flex-col gap-4">
            {users.map((user, i) => (
              <UserCard
                key={user.id}
                user={user}
                rank={i}
                prevRank={prevRanks.get(user.id)}
                celebrate={celebrateId.current === user.id}
              />
            ))}
          </motion.ul>
        </LayoutGroup>
      )}
    </section>
  );
}
