import { SupabaseClient } from "@supabase/supabase-js";
import { CultUser, ProfileRow } from "./types";

const FALLBACK_AVATAR = "/default-avatar.svg";

export function mapProfile(row: ProfileRow, supabase: SupabaseClient): CultUser {
  const avatar = row.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(row.avatar_path).data.publicUrl
    : FALLBACK_AVATAR;

  return {
    id: row.id,
    name: row.name,
    handle: row.username,
    avatar,
    totalPaid: Number(row.total_paid),
    socials: {
      instagram: row.instagram_url ?? undefined,
      twitter: row.twitter_url ?? undefined,
      facebook: row.facebook_url ?? undefined,
      youtube: row.youtube_url ?? undefined,
      custom1:
        row.custom_link1_url && row.custom_link1_label
          ? { url: row.custom_link1_url, label: row.custom_link1_label }
          : undefined,
      custom2:
        row.custom_link2_url && row.custom_link2_label
          ? { url: row.custom_link2_url, label: row.custom_link2_label }
          : undefined,
    },
  };
}
