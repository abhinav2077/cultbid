"use client";

import { CurrentUser } from "@/lib/types";
import ProfileMenu from "./ProfileMenu";
import PayButton from "./PayButton";
import Image from "next/image";

export default function TopBar({
  currentUser,
  onPay,
}: {
  currentUser: CurrentUser | null;
  onPay: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center">
  <Image src="/logo.png" alt="cultbid.in" width={80} height={20} unoptimized priority />
</a>

        <div className="flex items-center gap-3">
          <PayButton onClick={onPay} />
          {currentUser ? (
            <ProfileMenu currentUser={currentUser} />
          ) : (
            <a
              href="/login"
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:border-white/20"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
