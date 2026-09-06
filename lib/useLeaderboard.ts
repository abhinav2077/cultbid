"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapProfile } from "@/lib/mapProfile";
import { CultUser, ProfileRow } from "@/lib/types";

/**
 * Fetches the leaderboard from Supabase and keeps it live:
 * any INSERT/UPDATE on `profiles` (anywhere — any browser, any
 * user paying) is pushed to every subscribed client via Supabase
 * Realtime, re-sorted, and re-rendered. The UserCard components'
 * `layout` animation is what turns "re-sorted" into "glides
 * smoothly to its new spot" — no extra work needed here.
 */
export function useLeaderboard() {
  const [users, setUsers] = useState<CultUser[]>([]);
  const [loading, setLoading] = useState(true);
  const prevRanks = useRef<Map<string, number>>(new Map());
  const supabase = createClient();

  useEffect(() => {
    // Create the channel synchronously, first thing, so the cleanup
    // function below always has a real channel to remove — even if
    // React unmounts this effect before the fetch below resolves
    // (which React 18 Strict Mode deliberately does once in dev, to
    // catch exactly this class of bug). Creating it after an `await`
    // was the previous bug: the first mount's channel never got
    // cleaned up, and the second mount tried to open another channel
    // with the same topic name, which Supabase's client rejects with
    // "cannot add postgres_changes callbacks... after subscribe()".
    const channel = supabase
      .channel("profiles-leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          setUsers((current) => {
            let next: CultUser[];

            if (payload.eventType === "DELETE") {
              next = current.filter((u) => u.id !== (payload.old as ProfileRow).id);
            } else {
              const updated = mapProfile(payload.new as ProfileRow, supabase);
              // Accounts exist the moment someone signs up (free, no
              // payment required) — but they only appear on the board
              // once they've paid at least ₹1. A bio edit or other
              // update on a still-unpaid profile must not sneak them
              // onto the list, so this filters both directions.
              if (updated.totalPaid < 1) {
                next = current.filter((u) => u.id !== updated.id);
              } else {
                const exists = current.some((u) => u.id === updated.id);
                next = exists
                  ? current.map((u) => (u.id === updated.id ? updated : u))
                  : [...current, updated];
              }
            }

            return next.sort((a, b) => b.totalPaid - a.totalPaid);
          });
        }
      )
      .subscribe();

    let cancelled = false;

    async function loadInitial() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .gte("total_paid", 1)
        .order("total_paid", { ascending: false });

      if (!cancelled && !error && data) {
        setUsers((data as ProfileRow[]).map((row) => mapProfile(row, supabase)));
      }
      if (!cancelled) setLoading(false);
    }

    loadInitial();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track previous rank per user so cards know whether they moved up/down.
  useEffect(() => {
    const next = new Map<string, number>();
    users.forEach((u, i) => next.set(u.id, i));
    prevRanks.current = next;
  }, [users]);

  return { users, loading, prevRanks: prevRanks.current };
}
