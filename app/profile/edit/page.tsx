"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProfileRow } from "@/lib/types";
import Spinner from "@/components/Spinner";
import AvatarCropperModal from "@/components/AvatarCropperModal";

const DEFAULT_AVATAR = "/default-avatar.svg";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data as ProfileRow);
        setAvatarUrl(
          data.avatar_path
            ? supabase.storage.from("avatars").getPublicUrl(data.avatar_path).data.publicUrl
            : DEFAULT_AVATAR
        );
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  // Open the crop modal instead of uploading immediately — the raw
  // file is only turned into a blob and uploaded once they confirm
  // a square crop, in handleCropConfirm below.
  setCropSrc(URL.createObjectURL(file));
  e.target.value = ""; // lets picking the same file again re-trigger onChange
}

async function handleCropConfirm(blob: Blob) {
  if (!profile) return;

  if (cropSrc) URL.revokeObjectURL(cropSrc);
  setCropSrc(null);
  setUploading(true);
  setError(null);

  // Cropped output is always a JPEG (see lib/cropImage.ts), so the
  // storage path extension is fixed regardless of what was uploaded.
  const path = `${profile.id}/profile.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

  if (uploadError) {
    setError(uploadError.message);
    setUploading(false);
    return;
  }

  await supabase.from("profiles").update({ avatar_path: path }).eq("id", profile.id);
  setProfile({ ...profile, avatar_path: path });
  // Cache-bust so the new crop shows immediately instead of the
  // browser reusing a cached image at the same URL.
  setAvatarUrl(`${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?t=${Date.now()}`);
  setUploading(false);
}

function handleCropCancel() {
  if (cropSrc) URL.revokeObjectURL(cropSrc);
  setCropSrc(null);
}

  async function handleAvatarDelete() {
    if (!profile || !profile.avatar_path) return;

    setDeleting(true);
    setError(null);

    // Best-effort cleanup of the underlying file — not fatal if it fails
    // (e.g. already gone), the column update below is what actually matters.
    await supabase.storage.from("avatars").remove([profile.avatar_path]).catch(() => {});

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", profile.id);

    setDeleting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfile({ ...profile, avatar_path: null });
    setAvatarUrl(DEFAULT_AVATAR);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        gender: profile.gender,
        instagram_url: profile.instagram_url,
        twitter_url: profile.twitter_url,
        facebook_url: profile.facebook_url,
        youtube_url: profile.youtube_url,
        custom_link1_url: profile.custom_link1_url,
        custom_link1_label: profile.custom_link1_label,
        custom_link2_url: profile.custom_link2_url,
        custom_link2_label: profile.custom_link2_label,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted">
        <Spinner className="h-5 w-5 text-neon" />
        Loading…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      {cropSrc && (
  <AvatarCropperModal imageSrc={cropSrc} onCancel={handleCropCancel} onCropped={handleCropConfirm} />
)}
      <button
        onClick={() => router.push("/")}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="mb-6 font-display text-xl font-semibold text-white">Edit profile</h1>

      <div className="mb-6 flex items-center gap-4">
        <Image
          src={avatarUrl}
          alt="Avatar"
          width={64}
          height={64}
          unoptimized
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="flex gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-white/85 hover:border-white/20">
            {uploading && <Spinner className="h-3.5 w-3.5 text-neon" />}
            {uploading ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
          {profile.avatar_path && (
            <button
              onClick={handleAvatarDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-rose-400 hover:border-rose-400/50 disabled:opacity-60"
            >
              {deleting && <Spinner className="h-3.5 w-3.5 text-rose-400" />}
              {deleting ? "Removing…" : "Delete photo"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
        <Field label="Username" value={profile.username} onChange={(v) => setProfile({ ...profile, username: v })} />
        <Field label="Bio" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} textarea />

        <Field
          label="Instagram URL"
          value={profile.instagram_url ?? ""}
          onChange={(v) => setProfile({ ...profile, instagram_url: v })}
        />
        <Field
          label="X / Twitter URL"
          value={profile.twitter_url ?? ""}
          onChange={(v) => setProfile({ ...profile, twitter_url: v })}
        />
        <Field
          label="Facebook URL"
          value={profile.facebook_url ?? ""}
          onChange={(v) => setProfile({ ...profile, facebook_url: v })}
        />
        <Field
          label="YouTube URL"
          value={profile.youtube_url ?? ""}
          onChange={(v) => setProfile({ ...profile, youtube_url: v })}
        />

        <div className="mt-2 grid grid-cols-2 gap-3">
          <Field
            label="Custom link 1 — label"
            value={profile.custom_link1_label ?? ""}
            onChange={(v) => setProfile({ ...profile, custom_link1_label: v })}
          />
          <Field
            label="Custom link 1 — URL"
            value={profile.custom_link1_url ?? ""}
            onChange={(v) => setProfile({ ...profile, custom_link1_url: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Custom link 2 — label"
            value={profile.custom_link2_label ?? ""}
            onChange={(v) => setProfile({ ...profile, custom_link2_label: v })}
          />
          <Field
            label="Custom link 2 — URL"
            value={profile.custom_link2_url ?? ""}
            onChange={(v) => setProfile({ ...profile, custom_link2_url: v })}
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-neon py-2.5 text-sm font-semibold text-void shadow-neon disabled:opacity-60"
        >
          {saving && <Spinner className="h-4 w-4 text-void" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  const className =
    "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-white outline-none focus-visible:border-neon";
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={className} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={className} />
      )}
    </label>
  );
}
