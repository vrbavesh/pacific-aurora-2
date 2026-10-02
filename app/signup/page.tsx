"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorResponse } from "@/src/lib/api/errors";
import { readJson, requireString } from "@/src/server/http";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
        if (!res.ok) throw new Error(data.error?.message ?? "Signup failed");
        setStep("otp");
        setCooldown(120);
        const timer = setInterval(() => {
          setCooldown((c) => (c <= 1 ? (clearInterval(timer), 0) : c - 1));
        }, 1000);
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
        router.push("/home");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      if (!res.ok) throw new Error("Could not resend");
      setCooldown(120);
      const timer = setInterval(() => {
        setCooldown((c) => (c <= 1 ? (clearInterval(timer), 0) : c - 1));
      }, 1000);
    } catch {
      /* toast */
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 bg-background">
      <section className="w-full max-w-md space-y-6">
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80 mb-2">
            Pacific Aurora
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create your account
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "form" && (
            <div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101a] transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send code"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div>
              <p className="text-sm text-foreground/70 text-center">
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  inputMode="numeric"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-center text-2xl tracking-widest text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101a] transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <p className="text-center text-sm text-foreground/50">
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="text-accent hover:underline disabled:text-foreground/30"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
            </div>
          )}
        </form>

        {error && (
          <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <p className="text-center text-sm text-foreground/50">
          Already have an account?{" "}
          <Link href="/signin" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-background px-4 text-xs text-foreground/40">
            Or continue with
          </span>
        </div>

        <button
          onClick={() => (window.location.href = "/api/auth/google")}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          <span className="font-medium">Continue with Google</span>
        </button>
      </section>

      <p className="text-center text-sm text-foreground/50">
        Already have an account?{" "}
        <Link href="/signin" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
  </main>
  );
}