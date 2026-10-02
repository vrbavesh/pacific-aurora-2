"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, userId: userId || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "Onboarding failed");
      }
      router.push("/home");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Onboarding failed");
    } finally {
      setLoading(false);
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
            Set up your profile
          </h1>
          <p className="text-sm text-foreground/70 mt-2">
            Choose how you&apos;ll appear. You can change this later.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              maxLength={30}
              pattern="[a-zA-Z0-9_-]+"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            <p className="mt-1 text-xs text-foreground/50">
              Letters, numbers, underscores, hyphens. Unique across Pacific Aurora.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !userId.trim()}
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-[#06101a] transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Continue to home"}
          </button>
        </form>

        <p className="text-center text-sm text-foreground/50">
          <a href="/home" className="text-accent hover:underline">
            Skip for now
          </a>
        </p>
      </section>
    </main>
  );
}