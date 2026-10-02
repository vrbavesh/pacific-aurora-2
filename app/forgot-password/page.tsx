"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (step === "email") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) throw new Error("Could not send code");
        setStep("otp");
        startCooldown();
      } else if (step === "otp") {
        const res = await fetch("/api/auth/password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, newPassword }),
        });
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

  const startCooldown = () => {
    setCooldown(120);
    const timer = setInterval(() => {
      setCooldown((c) => (c <= 1 ? (clearInterval(timer), 0) : c - 1));
    }, 1000);
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    fetch("/api/auth/otp/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, type: "recovery" }),
    }).then(() => startCooldown());
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 bg-background">
      <section className="w-full max-w-md space-y-6">
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80 mb-2">
            Pacific Aurora
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Reset your password
          </h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "email" && (
            <>
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
              <button
                type="submit"
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101a] transition hover:brightness-110"
              >
                Send reset code
              </button>
            </>
          )}

          {step === "otp" && (
            <>
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
              <div>
                <label className="block text-sm font-medium mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101a] transition hover:brightness-110"
              >
                Reset password
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
            </>
          )}
        </form>

        <p className="text-center text-sm text-foreground/50">
          Remembered it?{" "}
          <Link href="/signin" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}