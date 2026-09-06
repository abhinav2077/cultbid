export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

/** Raw row shape from the `profiles` table. */
export interface ProfileRow {
  id: string;
  username: string;
  name: string;
  bio: string;
  gender: Gender | null;
  avatar_path: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  custom_link1_url: string | null;
  custom_link1_label: string | null;
  custom_link2_url: string | null;
  custom_link2_label: string | null;
  total_paid: number;
  created_at: string;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  custom1?: { url: string; label: string };
  custom2?: { url: string; label: string };
}

/** View-model the leaderboard UI actually renders. */
export interface CultUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  totalPaid: number;
  socials: SocialLinks;
}

export interface CurrentUser {
  id: string;
  name: string;
  avatar: string;
}
