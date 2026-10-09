"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, ApiRequestError } from "@/src/lib/api/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Spec: Google sign-up lands here with the username prefilled (editable).
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ profile: { username?: string | null; userId?: string | null } | null }>("/api/auth/session")
      .then(({ data }) => {
        const prefilled = data.profile?.username;
        if (!cancelled && typeof prefilled === "string" && prefilled.trim()) {
          setUsername((current) => current || prefilled);
        }
        if (!cancelled && data.profile?.userId) setUserId(current => current || data.profile!.userId!);
      })
      .catch(() => {
        // Session unavailable: leave the form empty rather than blocking onboarding.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const sanitizedUserId = userId.replace(/^@/, "").trim();
      await apiFetch("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({
          username: username.trim(),
          userId: sanitizedUserId || undefined,
        }),
      });
      router.push("/home");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        router.push("/signin");
        return;
      }
      setError(err instanceof Error ? err.message : "Profile setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="frosted-panel relative w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl"
      >
        {/* Subtle Decorative Ambient Beam */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-48 rounded-full bg-accent/20 blur-3xl"
        />

        {/* Editorial Header */}
        <header className="text-center space-y-2 mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-accent/90"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>Onboarding</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-light tracking-tight text-white sm:text-4xl"
          >
            Identity & <span className="font-editorial italic font-normal">Origins</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-xs text-foreground-subtle max-w-xs mx-auto leading-relaxed"
          >
            Choose how your name and unique identifier appear across Pacific Aurora.
          </motion.p>
        </header>

        {/* Calm White Notice for Errors */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="calm-notice mb-6 rounded-2xl p-3.5 text-center text-xs leading-relaxed text-white/95"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-1.5"
          >
            <label className="block text-xs font-mono tracking-wider uppercase text-foreground-subtle">
              Display Name
            </label>
            <motion.input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              maxLength={50}
              required
              disabled={loading}
              placeholder="e.g. Ursula K. Le Guin"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle/50 transition-all duration-200 focus:border-accent/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
              whileFocus={{ scale: 1.005 }}
            />
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-[10px] text-foreground-subtle/70"
            >
              The public name attributed to your worlds and prose.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="space-y-1.5"
          >
            <label className="block text-xs font-mono tracking-wider uppercase text-foreground-subtle">
              Unique User ID
            </label>
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative"
            >
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-accent/80">
                @
              </span>
              <motion.input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                onFocus={() => setFocusedField("userId")}
                onBlur={() => setFocusedField(null)}
                maxLength={30}
                required
                disabled={loading}
                placeholder="author_handle"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-foreground-subtle/40 transition-all duration-200 focus:border-accent/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
                whileFocus={{ scale: 1.005 }}
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-[10px] text-foreground-subtle/70"
            >
              Unique handle across the platform (letters, numbers, dashes, underscores).
            </motion.p>
          </motion.div>

        {/* Real-time Identifier Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center"
        >
          <span className="text-[10px] uppercase tracking-widest text-foreground-subtle block mb-1">
            Author Card Preview
          </span>
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="font-editorial text-base text-white block"
          >
            {username || "Author Name"}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="block font-mono text-xs text-accent/80 mt-0.5"
          >
            @{userId.replace(/^@/, "") || "handle"}
          </motion.span>
        </motion.div>

        <motion.button
          type="submit"
          disabled={loading || !username.trim() || !userId.trim()}
          whileHover={{ y: -1, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-[#040911] shadow-[0_0_24px_rgba(45,212,191,0.25)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(45,212,191,0.45)] hover:brightness-105 disabled:opacity-50"
        >
          {loading ? "Establishing identity…" : "Enter Your Workspace"}
        </motion.button>
        </form>

        {/* Footer Link */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center text-xs text-foreground-subtle"
        >
          <Link
            href="/signin"
            className="text-foreground-subtle/60 hover:text-foreground-subtle hover:underline transition-colors"
          >
            Back to sign in
          </Link>
        </motion.p>
      </motion.section>
    </main>
  );
}
