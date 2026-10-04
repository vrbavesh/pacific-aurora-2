"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import AuroraBackground from "@/src/components/AuroraBackground";
import { useScroll, useTransform } from "motion/react";

export default function LandingPage() {
  const { scrollY } = useScroll();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Parallax transforms for scroll-driven effects
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 0.92]);
  
  // Parallax for floating elements
  const floatY1 = useTransform(scrollY, [0, 800], [0, -80]);
  const floatY2 = useTransform(scrollY, [0, 800], [0, -120]);
  const floatY3 = useTransform(scrollY, [0, 800], [0, -60]);

  return (
    <main className="relative flex min-h-screen flex-col justify-between px-6 py-6 sm:px-12 sm:py-10">
      {/* Top Editorial Bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#2dd4bf]" />
          <span className="font-mono text-xs tracking-[0.25em] uppercase text-foreground-subtle">
            Pacific Aurora <span className="text-white/20">/</span> Ver. 2.0
          </span>
        </div>

        {/* Top-right Navigation Actions */}
        <nav className="flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2 text-xs font-medium tracking-wide text-foreground/90 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-accent/90 px-5 py-2 text-xs font-semibold tracking-wide text-[#040911] shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all duration-300 hover:bg-accent hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] hover:scale-[1.02]"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      {/* Hero: Locomotive Editorial Precision + Resn Fluidity */}
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center text-center py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6"
        >
          {/* Subtle Editorial Pill */}
          <div className="editorial-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>A Sanctuary for Literary Architecture</span>
          </div>

          {/* Centered Headline with Serif Contrast */}
          <h1 className="max-w-3xl text-4xl font-light tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08]">
            A scratchpad for worlds that <br className="hidden sm:inline" />
            <span className="font-editorial italic font-normal text-white drop-shadow-[0_2px_24px_rgba(45,212,191,0.25)]">
              want to breathe.
            </span>
          </h1>

          {/* Body Prose strictly following Project Spec */}
          <p className="max-w-2xl text-balance text-base sm:text-lg leading-relaxed text-foreground-muted/90 font-light">
            Draft books, lay out worlds, and trace the people in them — calm,
            private, and quietly your own.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/signup"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-accent px-8 py-3.5 text-sm font-semibold tracking-wide text-[#040911] shadow-[0_0_32px_rgba(45,212,191,0.35)] transition-all duration-300 hover:shadow-[0_0_48px_rgba(45,212,191,0.6)]"
              >
                <span>Create an Account</span>
                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-8 py-3.5 text-sm font-medium tracking-wide text-foreground/90 backdrop-blur-md transition-all duration-300 hover:border-white/35 hover:bg-white/[0.08] hover:text-white"
              >
                <span>Sign In</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Bottom Editorial Grid: Quiet Architecture Elements */}
      <footer className="grid grid-cols-1 gap-6 border-t border-white/[0.08] pt-6 sm:grid-cols-3 sm:gap-4 sm:pt-8 text-left">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/80">
            01 / Atmospheric Focus
          </span>
          <p className="text-xs text-foreground-subtle leading-relaxed">
            Distraction-free rich prose drafting powered by TipTap, framed in a 60fps WebGL celestial chamber.
          </p>
        </div>

        <div className="flex flex-col gap-1 sm:border-l sm:border-white/[0.08] sm:pl-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/80">
            02 / Interconnected Worlds
          </span>
          <p className="text-xs text-foreground-subtle leading-relaxed">
            Relational character graphs with tactile sentiment dynamics, places, items, and custom ontology.
          </p>
        </div>

        <div className="flex flex-col gap-1 sm:border-l sm:border-white/[0.08] sm:pl-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/80">
            03 / Quiet Sovereignty
          </span>
          <p className="text-xs text-foreground-subtle leading-relaxed">
            Strict row-level security isolation. Calming white alerts. A workspace devoted exclusively to your craft.
          </p>
        </div>
      </footer>
    </main>
  );
}
