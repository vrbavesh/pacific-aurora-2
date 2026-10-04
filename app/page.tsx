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
    <main className="relative flex min-h-screen flex-col px-6 py-6 sm:px-12 sm:py-10">
      {/* Top Editorial Bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_#2dd4bf]" />
          <span className="font-mono text-xs tracking-[0.25em] uppercase text-foreground-subtle">
            Pacific Aurora
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

      {/* Feature Sections: What Authors Can Do */}
      <section className="mx-auto w-full max-w-4xl py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-16"
        >
          {/* Write & Draft */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 6.5L17.5 3.25m0 0L20.75 6.5 17.5 9.75m-3.25 0H17.5" />
                </svg>
              </div>
              <div>
                <h3 className="heading-3 font-semibold tracking-tight">Write Without Distraction</h3>
                <p className="body text-foreground-muted/90 mt-2 max-w-xl">
                  A serene TipTap editor with a calm, focused canvas. Auto-save, chapter tabs, word count, and a fluid reading experience — nothing between you and the prose.
                </p>
              </div>
            </div>
          </div>

          {/* Worlds & Entities */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <h3 className="heading-3 font-semibold tracking-tight">Build Living Worlds</h3>
                <p className="body text-foreground-muted/90 mt-2 max-w-xl">
                  Create worlds with characters, places, items, and custom entity types. Each entity carries rich fields — traits, mutations, status, wielder relationships — all interconnected.
                </p>
              </div>
            </div>
          </div>

          {/* Relationships & Timelines */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="heading-3 font-semibold tracking-tight">Map Relationships & Timelines</h3>
                <p className="body text-foreground-muted/90 mt-2 max-w-xl">
                  Visual character graphs with sentiment sliders (love ↔ hate), relationship types, and per-book character timelines. Track who died in Chapter 2 and returned in Chapter 6.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="heading-3 font-semibold tracking-tight">Your Work, Your Rules</h3>
                <p className="body text-foreground-muted/90 mt-2 max-w-xl">
                  Row-level security enforces strict isolation — 404 on any cross-user access. Calm white error surfaces, never screaming red. OTP verification with 2-minute cooldowns. Your data never leaks.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto w-full max-w-4xl pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-6"
        >
          <p className="overline text-accent/80 tracking-widest">Ready to Begin</p>
          <h2 className="heading-2 font-light tracking-tight text-foreground">
            Your worlds are waiting.
          </h2>
          <p className="body text-foreground-muted/90 max-w-xl mx-auto">
            Create an account and start building the stories only you can tell.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
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
    </main>
  );
}