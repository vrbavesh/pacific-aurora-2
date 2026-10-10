"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import GoogleAuthButton from "@/src/components/GoogleAuthButton";
import { redirectAfterAuth, setToken } from "@/src/lib/api/client";

export default function SigninPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Uniform calm error as required by specification
        throw new Error("user not found, but don't worry you can try again");
      }
      const token = data?.data?.session?.access_token;
      if (typeof token === "string" && token) setToken(token);
      // Flag check: incomplete profiles go to onboarding, complete ones to home.
      await redirectAfterAuth((path) => {
        router.push(path);
        router.refresh();
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "user not found, but don't worry you can try again";
      setError(msg);
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
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-light tracking-tight text-white sm:text-4xl"
          >
            Welcome <span className="font-editorial italic font-normal">back</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-xs text-foreground-subtle max-w-xs mx-auto leading-relaxed"
          >
            Enter your credentials to enter your serene worldbuilding space.
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
              Email or User ID
            </label>
            <motion.input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
              placeholder="you@example.com or @username"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle/50 transition-all duration-200 focus:border-accent/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
              whileFocus={{ scale: 1.005 }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono tracking-wider uppercase text-foreground-subtle">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-accent/90 hover:text-accent hover:underline transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <motion.input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle/50 transition-all duration-200 focus:border-accent/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
              whileFocus={{ scale: 1.005 }}
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ y: -1, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-[#040911] shadow-[0_0_24px_rgba(45,212,191,0.25)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(45,212,191,0.45)] hover:brightness-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? "Signing in…" : "Sign In"}
          </motion.button>
        </form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="relative my-7"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-foreground-subtle/70">
            <span className="bg-[#06121e]/90 px-3 py-0.5 rounded-full border border-white/[0.06]">
              or continue with
            </span>
          </div>
        </motion.div>

        {/* Google Auth Button */}
        <GoogleAuthButton onError={setError} />

        {/* Footer Link */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center text-xs text-foreground-subtle"
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-accent hover:text-accent-dim hover:underline font-medium transition-colors"
          >
            Create account
          </Link>
        </motion.p>
      </motion.section>
    </main>
  );
}
