import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EDITABLE_FIELDS = [
  "name",
  "username",
  "bio",
  "gender",
  "instagram_url",
  "twitter_url",
  "facebook_url",
  "youtube_url",
  "custom_link1_url",
  "custom_link1_label",
  "custom_link2_url",
  "custom_link2_label",
] as const;

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Only ever pick known, client-editable columns — total_paid is not
  // in this list, and the DB grants would reject it even if it were.
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
