"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (step === "form") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message ?? "Unable to create account");
        setStep("otp");
        setCooldown(120);
      } else {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 410) throw new Error("Code expired. Please resend.");
          throw new Error("Invalid code. Please try again.");
        }
        router.push("/onboarding");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "signup" }),
      });
      if (!res.ok) throw new Error("Could not resend code");
      setCooldown(120);
    } catch {
      setError("Unable to resend verification code right now.");
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
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
            <span>Registration</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-light tracking-tight text-white sm:text-4xl"
          >
            {step === "form" ? (
              <>
                Create your <span className="font-editorial italic font-normal">sanctuary</span>
              </>
            ) : (
              <>
                Verify your <span className="font-editorial italic font-normal">email</span>
              </>
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-xs text-foreground-subtle max-w-xs mx-auto leading-relaxed"
          >
            {step === "form"
              ? "A serene scratchpad for your worlds, characters, and timelines."
              : `Enter the 6-digit confirmation code dispatched to ${email}`}
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
          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div
                key="step-form"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="space-y-1.5"
                >
                  <label className="block text-xs font-mono tracking-wider uppercase text-foreground-subtle">
                    Email Address
                  </label>
                  <motion.input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    disabled={loading}
                    placeholder="author@pacificaurora.dev"
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
                  <label className="block text-xs font-mono tracking-wider uppercase text-foreground-subtle">
                    Password
                  </label>
                  <motion.input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength={8}
                    disabled={loading}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle/50 transition-all duration-200 focus:border-accent/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
                    whileFocus={{ scale: 1.005 }}
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-[#040911] shadow-[0_0_24px_rgba(45,212,191,0.25)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(45,212,191,0.45)] hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? "Generating verification code…" : "Continue with Email"}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="space-y-2 text-center"
                >
                  <label className="block text-xs font-mono tracking-wider uppercase text-foreground-subtle">
                    6-Digit Security Code
                  </label>
                  <motion.input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setFocusedField("otp")}
                    onBlur={() => setFocusedField(null)}
                    maxLength={6}
                    required
                    autoFocus
                    inputMode="numeric"
                    disabled={loading}
                    placeholder="••••••"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3.5 text-center font-mono text-2xl tracking-[0.5em] text-accent placeholder:text-foreground-subtle/30 transition-all duration-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    whileFocus={{ scale: 1.01 }}
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-[#040911] shadow-[0_0_24px_rgba(45,212,191,0.25)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(45,212,191,0.45)] hover:brightness-105 disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Confirm & Proceed"}
                </motion.button>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex items-center justify-between text-xs text-foreground-subtle pt-2"
                >
                  <motion.button
                    type="button"
                    onClick={() => setStep("form")}
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.97 }}
                    className="hover:text-white transition-colors"
                  >
                    ← Edit email
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-accent hover:underline disabled:text-foreground-subtle/40 disabled:no-underline font-mono"
                  >
                    {cooldown > 0
                      ? `Resend code in ${formatCooldown(cooldown)}`
                      : "Resend code"}
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Divider & Google Auth (only shown on initial form step) */}
        {step === "form" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-foreground-subtle/70">
                <span className="bg-[#06121e]/90 px-3 py-0.5 rounded-full border border-white/[0.06]">
                  or register with
                </span>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => (window.location.href = "/api/auth/google")}
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-medium text-foreground transition-all duration-200 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l1.68-1.68C18.78 4.18 15.9 2.5 12 2.5 8.74 2.5 5.95 4.32 4.5 6.78L1.4 4.24C2.55 2.26 5.14 1 8.5 1c3.02 0 5.56 1.53 6.94 3.88z"
                />
              </svg>
              <span>Continue with Google</span>
            </motion.button>
          </motion.div>
        )}

        {/* Footer Link */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center text-xs text-foreground-subtle"
        >
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-accent hover:text-accent-dim hover:underline font-medium transition-colors"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.section>
    </main>
  );
}