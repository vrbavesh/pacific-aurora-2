"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CaretDown,
  PencilSimple,
  SignOut,
  Trash,
  User,
  Warning,
} from "@phosphor-icons/react";
import { apiFetch, clearToken } from "@/src/lib/api/client";

interface UserProfile {
  username: string | null;
  userId: string | null;
}

export default function AccountMenu() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmationInput = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (deleteOpen) confirmationInput.current?.focus();
  }, [deleteOpen]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* session may already be invalid; clear locally either way */
    }
    clearToken();
    window.location.href = "/";
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setConfirmation("");
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    if (confirmation !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch("/api/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
      });
      clearToken();
      window.location.assign("/");
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete your account. Please try again.",
      );
      setDeleting(false);
    }
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
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="mt-1 flex w-full items-center gap-3 px-3 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-400/10 hover:text-rose-100"
                >
                  <Trash size={16} weight="regular" aria-hidden="true" />
                  Delete account
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#02070c]/80 p-4"
            initial={reduce ? false : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              aria-describedby="delete-account-description"
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md border border-rose-300/25 bg-[#0a1826] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-rose-300/30 bg-rose-400/10 text-rose-100">
                  <Warning size={20} weight="fill" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="delete-account-title" className="text-lg font-medium text-white">
                    Delete account permanently?
                  </h2>
                  <p
                    id="delete-account-description"
                    className="mt-2 text-sm leading-6 text-foreground-muted"
                  >
                    This permanently removes your profile and all worlds, books,
                    chapters, entities, timelines, and relationships. It cannot be undone.
                  </p>
                </div>
              </div>

              <label htmlFor="delete-account-confirmation" className="mt-6 block text-sm text-white">
                Type <span className="font-medium">DELETE</span> to confirm
              </label>
              <input
                ref={confirmationInput}
                id="delete-account-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={deleting}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 w-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-foreground-muted focus:border-rose-200 focus:ring-2 focus:ring-rose-200/25 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="DELETE"
                aria-describedby={deleteError ? "delete-account-error" : undefined}
              />
              {deleteError && (
                <p id="delete-account-error" className="mt-3 text-sm text-rose-200" role="alert">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  disabled={deleting}
                  className="border border-white/15 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={confirmation !== "DELETE" || deleting}
                  aria-busy={deleting}
                  className="bg-rose-300 px-4 py-2 text-sm font-medium text-[#1a080c] transition-colors hover:bg-rose-200 disabled:cursor-not-allowed disabled:bg-rose-300/40 disabled:text-[#1a080c]/60"
                >
                  {deleting ? "Deleting account..." : "Delete account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
