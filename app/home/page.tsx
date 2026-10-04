"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import AccountMenu from "@/src/components/AccountMenu";
import AuroraBackground from "@/src/components/AuroraBackground";
import { PageTransition, StaggerContainer, StaggerItem, GlassPanel } from "@/src/components/PageTransition";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  
  const navOpacity = useTransform(scrollY, [0, 200], [1, 0.7]);
  const sidebarY = useTransform(scrollY, [0, 500], [0, 60]);
  const contentY = useTransform(scrollY, [0, 500], [0, 40]);
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0.85]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="relative flex min-h-[100dvh]">
      <AuroraBackground />

      {/* Page transition wrapper */}
      <PageTransition>

        {/* Top bar with account menu */}
        <motion.header
          initial={reduce ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ opacity: navOpacity }}
          className="absolute right-0 top-0 z-[var(--z-sticky)] flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden sm:block rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-foreground/90 transition hover:border-white/30 hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn btn-primary text-sm px-4 py-2"
            >
              Create account
            </Link>
          </div>
          <AccountMenu />
        </motion.header>

        {/* Main layout */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Left navigation */}
          <motion.aside
            initial={reduce ? false : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block w-72 border-r border-border p-4 space-y-8 overflow-y-auto"
            style={{ y: sidebarY }}
            aria-label="Navigation"
          >
            {/* BOOKS section */}
            <StaggerContainer>
              <StaggerItem delay={0.1}>
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="overline text-foreground/60 tracking-widest">
                      BOOKS
                    </h2>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      aria-label="Create new book"
                    >
                      <svg className="w-5 h-5 text-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </motion.button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="body-sm italic py-4 text-center text-foreground/40"
                    >
                      No books yet
                    </motion.div>
                  </div>
                </section>
              </StaggerItem>

              {/* WORLDS section */}
              <StaggerItem delay={0.2}>
                <section className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="overline text-foreground/60 tracking-widest">
                      WORLDS
                    </h2>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      aria-label="Create new world"
                    >
                      <svg className="w-5 h-5 text-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </motion.button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="body-sm italic py-4 text-center text-foreground/40"
                    >
                      No worlds yet
                    </motion.div>
                  </div>
                </section>
              </StaggerItem>
            </StaggerContainer>

            {/* Settings at bottom */}
            <div className="absolute bottom-4 left-4 right-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 hover:border-border-strong hover:bg-background-elevated transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82 5 5 0 0 1-6 6 5 5 0 0 1-6-6 1.65 1.65 0 0 1 .33-1.82m0-8a1.65 1.65 0 0 1 .33-1.82 5 5 0 0 1 6 6 5 5 0 0 1 6 6 1.65 1.65 0 0 1 .33-1.82" />
                </svg>
                <span>Settings</span>
              </motion.button>
            </div>
          </motion.aside>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar for mobile */}
            <header className="lg:hidden border-b border-border px-4 py-3 flex items-center justify-between">
              <h1 className="overline font-medium text-foreground/60">Pacific Aurora</h1>
              <AccountMenu />
            </header>

            {/* Centered content with frosted glass panel */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col items-center justify-center px-6"
              style={{ y: contentY, opacity: contentOpacity }}
            >
              <GlassPanel className="w-full max-w-2xl p-8 sm:p-12" hover>
                <section className="w-full text-center space-y-6">
                  <p className="overline text-accent/80 tracking-widest">
                    Pacific Aurora
                  </p>
                  <h1 className="heading-1 text-balance">
                    A scratchpad for worlds that want to breathe.
                  </h1>
                  <p className="body-lg max-w-[58ch] mx-auto text-balance">
                    Draft books, lay out worlds, and trace the people in them — calm,
                    private, and quietly your own.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/signup"
                      className="btn btn-primary w-full sm:w-auto shadow-glow"
                    >
                      Create account
                    </Link>
                    <Link
                      href="/signin"
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Sign in
                    </Link>
                  </div>
                </section>
              </GlassPanel>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </main>
  );
}