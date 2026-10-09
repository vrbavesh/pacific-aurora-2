"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CaretDown, PencilSimple, SignOut, User } from "@phosphor-icons/react";
import { apiFetch, clearToken } from "@/src/lib/api/client";

interface UserProfile {
  username: string | null;
  userId: string | null;
}

export default function AccountMenu() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    apiFetch<{ profile: UserProfile | null }>("/api/auth/session")
      .then(({ data }) => {
        setProfile(data.profile ?? { username: null, userId: null });
        setLoading(false);
      })
      .catch(() => {
        setProfile(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* session may already be invalid; clear locally either way */
    }
    clearToken();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="h-9 w-24 animate-pulse border border-white/10 bg-white/5" />
    );
  }

  return (
    <div className="relative">
      {/* Kept above the click-away overlay so the trigger stays usable. */}
      <motion.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="relative z-50 flex items-center gap-2 border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 text-foreground-muted transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center border border-white/10 bg-white/10">
          <User size={15} weight="regular" />
        </span>
        <span className="hidden text-sm sm:inline">{profile?.username ?? "Account"}</span>
        <motion.span
          animate={reduce ? undefined : { rotate: open ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.25, ease: "easeInOut" }}
          className="inline-flex text-foreground-muted"
          aria-hidden="true"
        >
          <CaretDown size={12} weight="bold" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 20, scale: 0.97 }}
              animate={reduce ? undefined : { opacity: 1, x: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, x: 20, scale: 0.97 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-full z-50 mt-3 w-72 origin-top-right border border-white/10 bg-[#0a1826]/95 p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-gradient-to-br from-white/20 to-white/5">
                  <User size={22} weight="regular" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-white">
                    {profile?.username ?? "Guest"}
                  </p>
                  {profile?.userId && (
                    <p className="truncate text-xs text-foreground-muted">
                      @{profile.userId}
                    </p>
                  )}
                </div>
              </div>

              <div className="py-2">
                <Link
                  href="/onboarding"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  <PencilSimple size={16} weight="regular" aria-hidden="true" />
                  Edit profile
                </Link>
              </div>

              <div className="border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  <SignOut size={16} weight="regular" aria-hidden="true" />
                  Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
