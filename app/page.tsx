import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapProfile } from "@/lib/mapProfile";
import { CurrentUser, ProfileRow } from "@/lib/types";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guests see the leaderboard too — currentUser is null until they
  // log in, and HomeClient/TopBar render a "Log in" state for that case.
  let currentUser: CurrentUser | null = null;

  if (user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    currentUser = profileRow
      ? (() => {
          const mapped = mapProfile(profileRow as ProfileRow, supabase);
          return { id: mapped.id, name: mapped.name, avatar: mapped.avatar };
        })()
      : { id: user.id, name: "New user", avatar: "/default-avatar.svg" };
  }

  return (
    <Suspense fallback={null}>
      <HomeClient currentUser={currentUser} />
    </Suspense>
  );
}
