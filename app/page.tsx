import Link from "next/link";
import AuroraBackground from "@/src/components/AuroraBackground";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col text-foreground">
      <AuroraBackground />

      {/* Top-right account actions */}
      <header className="absolute right-4 top-4 flex items-center gap-3 sm:right-6 sm:top-6">
        <Link
          href="/signin"
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101a] transition hover:brightness-110"
        >
          Create account
        </Link>
      </header>

      {/* Centered hero */}
      <section className="mx-auto flex flex-1 max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80">
          Pacific Aurora
        </p>
        <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          A scratchpad for worlds that want to breathe.
        </h1>
        <p className="max-w-[58ch] text-balance text-base leading-relaxed text-foreground/70">
          Draft books, lay out worlds, and trace the people in them — calm,
          private, and quietly your own.
        </p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-[#06101a] shadow-[0_0_24px_rgba(45,212,191,0.35)] transition hover:brightness-110"
          >
            Create account
          </Link>
          <Link
            href="/signin"
            className="rounded-full border border-white/15 px-8 py-3 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
          >
            Sign in
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-foreground/40">
        Serene by design.
      </footer>
    </main>
  );
}
