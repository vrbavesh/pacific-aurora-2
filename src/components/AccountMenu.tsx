"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

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
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.data?.profile ?? { username: null, userId: null });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      /* toast */
    }
  };

  if (loading) return null;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg
          className="w-5 h-5 text-foreground/60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="hidden sm:inline">{profile?.username ?? "Account"}</span>
        <motion.svg
          className="w-4 h-4 text-foreground/50"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <polyline points="18 15 12 21 6 15" />
        </motion.svg>
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
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl border border-white/10 bg-background/90 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)] z-50"
            >
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{profile?.username ?? "Your name"}</p>
                    <p className="text-xs text-foreground/50 truncate max-w-[160px]">@{profile?.userId ?? "userid"}</p>
                  </div>
                </div>
              </div>

              <motion.nav
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ staggerChildren: reduce ? 0 : 0.05, delayChildren: reduce ? 0 : 0.1 }}
                className="py-2"
              >
                <Link
                  href="/home"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground rounded-xl mx-2 hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Home</span>
                </Link>

                <Link
                  href="/home"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground rounded-xl mx-2 hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Profile</span>
                </Link>

                <hr className="my-2 border-white/10 mx-2" />

                <motion.button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-white/5 rounded-xl mx-2 transition-colors"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Log out</span>
                </motion.button>
              </motion.nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}