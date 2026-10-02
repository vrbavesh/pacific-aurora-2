import Link from "next/link";
import AuroraBackground from "@/src/components/AuroraBackground";
import AccountMenu from "@/src/components/AccountMenu";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] bg-background">
      <AuroraBackground />

      {/* Top bar with account menu */}
      <header className="absolute right-0 top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="hidden sm:block rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#06101a] transition hover:brightness-110"
          >
            Create account
          </Link>
        </div>
        <AccountMenu />
      </header>

      {/* Main layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left navigation */}
        <aside className="hidden lg:block w-72 border-r border-white/10 p-4 space-y-8 overflow-y-auto">
          {/* BOOKS section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/60">
                BOOKS
              </h2>
              <button className="p-1 rounded hover:bg-white/5 transition" aria-label="Create new book">
                <svg className="w-5 h-5 text-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Book entries will appear here */}
              <div className="text-xs text-foreground/40 italic py-4 text-center">
                No books yet
              </div>
            </div>
          </section>

          {/* WORLDS section */}
          <section className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/60">
                WORLDS
              </h2>
              <button className="p-1 rounded hover:bg-white/5 transition" aria-label="Create new world">
                <svg className="w-5 h-5 text-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="text-xs text-foreground/40 italic py-4 text-center">
                No worlds yet
              </div>
            </div>
          </section>

          {/* Settings icon at bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-foreground/60 hover:border-white/20 hover:bg-white/5 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82 5 5 0 0 1-6 6 5 5 0 0 1-6-6 1.65 1.65 0 0 1 .33-1.82m0-8a1.65 1.65 0 0 1 .33-1.82 5 5 0 0 1 6 6 5 5 0 0 1 6 6 1.65 1.65 0 0 1 .33 1.82" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar for mobile */}
          <header className="lg:hidden border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <h1 className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/60">Pacific Aurora</h1>
            <AccountMenu />
          </header>

          {/* Centered content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <section className="w-full max-w-2xl text-center space-y-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80">
                Pacific Aurora
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                A scratchpad for worlds that want to breathe.
              </h1>
              <p className="max-w-[58ch] text-balance text-base leading-relaxed text-foreground/70">
                Draft books, lay out worlds, and trace the people in them — calm,
                private, and quietly your own.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto rounded-full bg-accent px-8 py-3 text-sm font-semibold text-[#06101a] shadow-[0_0_24px_rgba(45,212,191,0.35)] transition hover:brightness-110"
                >
                  Create account
                </Link>
                <Link
                  href="/signin"
                  className="w-full sm:w-auto rounded-full border border-white/15 px-8 py-3 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
                >
                  Sign in
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}